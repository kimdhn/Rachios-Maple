# 메이플스토리 캐릭터 아바타 이미지 조회 API 가이드

**적용 대상 Schemas:** `CharacterBasic - character_image`

---

## 1. 쿼리 파라미터 기본 사용법

캐릭터 아바타 이미지를 조회할 때는 API 호출 URL 뒤에 물음표(`?`)와 `"Key=value"` 쌍을 입력하여 쿼리 파라미터를 전달합니다. 
여러 개의 파라미터를 함께 사용할 경우 앰퍼샌드(`&`)로 연결하여 하나의 문자열로 구성합니다.

* **기본 파라미터 조회 예시:**
    `https://open.api.nexon.com/static/maplestory/character/look/ABCEDFG?action=A41&emotion=E24&width=200&height=200&x=100&y=100`

### 1.1. 프레임(Frame) 값 적용
특정 액션 및 감정표현의 애니메이션 프레임을 지정하여 프레임별 이미지를 조회할 수 있습니다.
파라미터 값 뒤에 마침표(`.`)와 프레임 번호를 붙여 `"Key=value.number"` 형태로 입력합니다.

* **프레임 값 적용 예시 (action의 2번 프레임 조회):**
    `https://open.api.nexon.com/static/maplestory/character/look/ABCDEFG?action=A00.2&emotion=E00&width=200&height=200`

---

## 2. 공통 파라미터 가이드

액션(`action`)과 감정표현(`emotion`)을 제외한 공통 옵션 파라미터입니다.

| Parameter | Explanation | Guide |
| :--- | :--- | :--- |
| **wmotion** | 무기 모션 | W00: 기본 모션 (default, 무기 타입에 따름)<br>W01: 한손 모션<br>W02: 두손 모션<br>W03: 건 모션<br>W04: 무기 제외 |
| **width** | 가로 길이 | 배경 크기에 해당함 (96 [default] ~ 1000) |
| **height** | 세로 길이 | 배경 크기에 해당함 (96 [default] ~ 1000) |
| **x** | 캐릭터 가로 좌표 | 범위: `0 < x < width` (0은 왼쪽 시작점) |
| **y** | 캐릭터 세로 좌표 | 범위: `0 < y < height` (0은 상단 시작점) |

---

## 3. 액션 (Action) 파라미터 상세

캐릭터의 동작을 설정하는 `action` 파라미터 값과, 해당 액션에서 사용할 수 있는 유효 프레임(frame) 범위입니다.

| 코드 | 액션명 (Explanation) | 프레임 범위 |
| :--- | :--- | :--- |
| **A00** | stand1 (default) | 0 ~ 2 |
| **A01** | stand2 | 0 ~ 2 |
| **A02** | walk1 | 0 ~ 3 |
| **A03** | walk2 | 0 ~ 3 |
| **A04** | prone | 0 |
| **A05** | fly | 0 ~ 1 |
| **A06** | jump | 0 |
| **A07** | sit | 0 |
| **A08** | ladder | 0 ~ 1 |
| **A09** | rope | 0 ~ 1 |
| **A10** | heal | 0 ~ 2 |
| **A11** | alert | 0 ~ 2 |
| **A12** | proneStab | 0 ~ 1 |
| **A13** | swingO1 | 0 ~ 2 |
| **A14** | swingO2 | 0 ~ 2 |
| **A15** | swingO3 | 0 ~ 2 |
| **A16** | swingOF | 0 ~ 3 |
| **A17** | swingP1 | 0 ~ 2 |
| **A18** | swingP2 | 0 ~ 2 |
| **A19** | swingPF | 0 ~ 3 |
| **A20** | swingT1 | 0 ~ 2 |
| **A21** | swingT2 | 0 ~ 2 |
| **A22** | swingT3 | 0 ~ 2 |
| **A23** | swingTF | 0 ~ 3 |
| **A24** | stabO1 | 0 ~ 1 |
| **A25** | stabO2 | 0 ~ 1 |
| **A26** | stabOF | 0 ~ 2 |
| **A27** | stabT1 | 0 ~ 2 |
| **A28** | stabT2 | 0 ~ 2 |
| **A29** | stabTF | 0 ~ 3 |
| **A30** | shoot1 | 0 ~ 2 |
| **A31** | shoot2 | 0 ~ 4 |
| **A32** | shootF | 0 ~ 2 |
| **A33** | dead | 0 |
| **A34** | ghostwalk | 0 ~ 3 |
| **A35** | ghoststand | 0 ~ 2 |
| **A36** | ghostjump | 0 |
| **A37** | ghostproneStab | 0 ~ 1 |
| **A38** | ghostladder | 0 ~ 1 |
| **A39** | ghostrope | 0 ~ 1 |
| **A40** | ghostfly | 0 ~ 1 |
| **A41** | ghostsit | 0 |

---

## 4. 감정표현 (Emotion) 파라미터 상세

캐릭터의 표정을 설정하는 `emotion` 파라미터 값과, 해당 감정표현에서 사용할 수 있는 유효 프레임(frame) 범위입니다.

| 코드 | 감정표현명 (Explanation) | 프레임 범위 |
| :--- | :--- | :--- |
| **E00** | default (default) | 0 |
| **E01** | wink | 0 |
| **E02** | smile | 0 |
| **E03** | cry | 0 |
| **E04** | angry | 0 |
| **E05** | bewildered | 0 |
| **E06** | blink | 0 ~ 2 |
| **E07** | blaze | 0 ~ 1 |
| **E08** | bowing | 0 ~ 1 |
| **E09** | cheers | 0 |
| **E10** | chu | 0 |
| **E11** | dam | 0 ~ 1 |
| **E12** | despair | 0 ~ 1 |
| **E13** | glitter | 0 ~ 1 |
| **E14** | hit | 0 |
| **E15** | hot | 0 ~ 1 |
| **E16** | hum | 0 ~ 1 |
| **E17** | love | 0 ~ 1 |
| **E18** | oops | 0 |
| **E19** | pain | 0 |
| **E20** | troubled | 0 |
| **E21** | qBlue | 0 |
| **E22** | shine | 0 |
| **E23** | stunned | 0 |
| **E24** | vomit | 0 ~ 1 |