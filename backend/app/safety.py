"""명시적인 즉시 위험 표현을 LLM 대기 전에 확인하는 보조 규칙.

임상 위험도 척도가 아니며, 분류되지 않은 표현은 상담 모델의 문맥 검토를 병행한다.
"""

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class SafetySignal:
    detected: bool = False
    immediate: bool = False
    kind: str = "none"
    reason: str = ""
    evidence: tuple[str, ...] = ()


IMMEDIATE = re.compile(
    r"(?:죽을(?:거야|꺼야|거예요|거에요|겁니다|거다|게요|게)|죽으려고(?:해|하|합)|죽어버릴(?:거|게)|"
    r"자살(?:할거|하겠|하려고)|목숨을끊(?:을거|겠|으려고)|"
    r"(?:지금|당장|오늘).{0,10}죽고싶|"
    r"지금.{0,12}(?:나를|저를).{0,8}(?:해치려고|죽이려고))"
)
CUES = (
    ("suicide", re.compile(r"죽고싶|죽을생각|살기싫|살고싶지않|자살|목숨을끊")),
    ("self_harm", re.compile(r"자해|스스로(?:를)?다치게|내몸을해치")),
    ("violence", re.compile(r"협박|폭행|죽이겠|해치겠|때렸|때려요|때리고|위협")),
    ("bullying", re.compile(r"따돌(?:려|렸|림|리)|괴롭(?:혀|혔|힘|히)|왕따|계속.{0,12}놀려")),
    ("abuse", re.compile(r"학대|집에서.{0,12}맞(?:아|았)|강제로.{0,12}못나가")),
)
NEGATED = re.compile(
    r"(?:죽고싶지않|죽을(?:생각|마음|의도)(?:은|는|이|도)?없|"
    r"죽으려는(?:건|것은|게)아니|자살(?:할)?(?:생각|마음|의도)(?:은|는|이)?없|"
    r"자해(?:할)?(?:생각|마음|의도)(?:은|는|이)?없|"
    r"자해(?:는|를)?하지않|그럴생각(?:은|이)?없|"
    r"(?:죽을거|죽으려|자살할거|자해할거).{0,12}(?:생각|마음|의도|뜻|말).{0,4}(?:없|아니)|"
    r"(?:폭행|협박|학대|따돌림|괴롭힘)(?:은|는|이|을|를)?(?:당한적|받은적)?없)"
)
PAST = re.compile(r"(?:예전|작년|과거|지난해|어릴때).*(?:말했|들었|생각했|싶었|했었)")
FICTION = re.compile(r"(?:예문|대사|소설|영화|드라마|교육자료|안전교육)")
QUOTED = re.compile(r"(?:라는|라고|인용|읽|들었|봤|연습|표현)")


def screen_text(text: str) -> SafetySignal:
    """부정·인용·과거를 보수적으로 구분하고 현재의 명시적 표현을 찾는다."""
    found = []
    for raw in re.split(r"[.!?;\n]|하지만|그렇지만|그런데|그러나|지금은|이제는", text):
        clause = raw.strip()
        if not clause:
            continue
        compact = re.sub(r"[\s\W_]+", "", unicodedata.normalize("NFKC", clause)).lower()
        if (FICTION.search(compact) and QUOTED.search(compact)) or PAST.search(compact):
            continue
        if NEGATED.search(compact):
            continue
        if IMMEDIATE.search(compact):
            return SafetySignal(True, True, "suicide" if "죽" in compact or "자살" in compact or "목숨" in compact else "violence",
                "현재의 명시적인 위해 의도 또는 즉시 위협 표현을 확인했습니다. 사람의 즉시 확인이 필요합니다.", (clause[:500],))
        for kind, pattern in CUES:
            if pattern.search(compact):
                found.append((kind, clause[:500]))
                break
    if found:
        return SafetySignal(True, False, found[0][0],
            "도움이 필요한 표현을 확인했습니다. 문맥과 현재 상황은 교사가 확인해야 합니다.",
            tuple(dict.fromkeys(item[1] for item in found))[:4])
    return SafetySignal()
