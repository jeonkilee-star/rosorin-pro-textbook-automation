# -*- coding: utf-8 -*-
"""Design A의 각 레슨 블록에서 콘텐츠만 뽑아 lessons/*.json 스키마로 저장한다.
Design A를 기준 콘텐츠 소스로 쓰는 이유: 표/리스트/코드블록 구조가 가장 명시적(NCS 학습모듈형)이라
파싱 신뢰도가 가장 높음. B/C는 같은 콘텐츠를 재스타일링한 것뿐이므로 콘텐츠 손실 없음.
"""
import json, os
from bs4 import BeautifulSoup

SRC = r"C:\Users\robol\AppData\Local\Temp\claude\C--Users-robol-Downloads\8d1dca5d-c0f2-4242-95f0-e21993149d86\scratchpad\rosorin_textbook_designs.html"
OUT_DIR = r"C:\Users\robol\Downloads\ROSOrin_Pro_Python_커리큘럼\교재자동화\lessons"

LESSON_META = {
    "power":  {"id": "00-2", "prereq": None,               "time": "30분"},
    "ros2":   {"id": "02-1", "prereq": "00-2. 전원·충전·초기부팅", "time": "40분"},
    "move":   {"id": "03-1", "prereq": "02-1. ROS2 첫걸음",   "time": "40분"},
    "arm":    {"id": "09-1", "prereq": "03-1. 첫 이동 명령",   "time": "1시간"},
    "wheel":  {"id": "03-2", "prereq": "03-1. 첫 이동 명령",   "time": "1시간"},
    "line":   {"id": "06-1", "prereq": "03-2. 바퀴 전방향 테스트", "time": "1시간"},
}
ORDER = ["power", "ros2", "move", "wheel", "line", "arm"]  # 커리큘럼 번호(00→02→03→06→09) 순서


def li_html(ul):
    if not ul:
        return []
    return [li.decode_contents().strip() for li in ul.find_all('li', recursive=False)]


def table_rows(table):
    if not table:
        return None
    thead = table.find('thead')
    headers = [th.decode_contents().strip() for th in thead.find_all('th')] if thead else []
    rows = []
    tbody = table.find('tbody') or table
    for tr in tbody.find_all('tr', recursive=False):
        cells = [td.decode_contents().strip() for td in tr.find_all('td')]
        if cells:
            rows.append(cells)
    return {"headers": headers, "rows": rows}


def code_text(section):
    cb = section.select_one('.code-block')
    return cb.get_text() if cb else None


def extract_lesson(soup, key):
    div = soup.select_one(f'#mock-a-{key}')
    if not div:
        raise ValueError(f"lesson block not found: {key}")

    h1 = div.select_one('.a-band h1')
    title = h1.get_text(strip=True) if h1 else ""

    meta_divs = div.select('.a-meta > div')
    meta = {}
    for d in meta_divs:
        b = d.find('b')
        if b:
            label = b.get_text(strip=True)
            val = d.get_text(strip=True).replace(label, '', 1).strip()
            meta[label] = val

    sections = div.select('.a-body > section')
    data = {
        "id": LESSON_META[key]["id"],
        "key": key,
        "title": title,
        "moduleTime": meta.get('훈련시간', LESSON_META[key]["time"]),
        "prereq": meta.get('선수 학습', LESSON_META[key]["prereq"]),
        "moduleName": meta.get('학습모듈명', 'ROSOrin Pro 활용 자율주행 로봇 프로그래밍'),
        "tracks": ["jeondae", "daehak"],
        "objectives": [], "knowledge": [], "materials": {}, "safety": [],
        "procedure": None, "code": None, "codeTip": None,
        "recordTable": None, "recordNote": None,
        "evaluation": None, "advanced": [], "troubleshooting": None,
        "checkQuestions": None, "advancedTask": None,
    }

    # photo block (wheel-photo-wrap / servo-photo-wrap), keep raw HTML — it's already
    # design-agnostic (uses .wheel-photo/.servo-photo classes shared across all 3 designs' CSS)
    photo_wrap = div.select_one('.a-body > .wheel-photo-wrap, .a-body > .servo-photo-wrap')
    data['photoBlockHtml'] = str(photo_wrap) if photo_wrap else None

    for sec in sections:
        title_el = sec.select_one('.a-sec-title')
        if not title_el:
            continue
        sec_title = title_el.get_text(strip=True)
        sec_title = ''.join(ch for ch in sec_title if not ch.isdigit())  # strip leading number

        if '학습목표' in sec_title:
            data['objectives'] = li_html(sec.find('ul'))

        elif '필요지식' in sec_title:
            data['knowledge'] = li_html(sec.find('ul'))

        elif sec_title.startswith('수행내용'):
            boxes = sec.select('.a-subgrid .a-box')
            for b in boxes:
                bb = b.find('b')
                if bb:
                    label = bb.get_text(strip=True)
                    val = b.decode_contents()
                    val = val.split('</b>', 1)[-1].strip()
                    data['materials'][label] = val
            warn = sec.select_one('.a-warn ol')
            data['safety'] = li_html(warn)
            proc_table = sec.select_one('table')
            data['procedure'] = table_rows(proc_table)
            data['code'] = code_text(sec)
            tip = sec.select_one('p')
            data['codeTip'] = tip.decode_contents().strip() if tip and 'Tip' in tip.get_text() else None

        elif '실습 결과 기록' in sec_title:
            rt = sec.select_one('table.record-table')
            data['recordTable'] = table_rows(rt)
            note = sec.select_one('.record-note')
            data['recordNote'] = note.get('placeholder') if note else None

        elif sec_title == '평가':
            data['evaluation'] = table_rows(sec.find('table'))

        elif '심화 개념' in sec_title:
            data['advanced'] = li_html(sec.find('ul'))

        elif '트러블슈팅' in sec_title:
            data['troubleshooting'] = table_rows(sec.find('table'))

        elif '개념 확인' in sec_title:
            data['checkQuestions'] = table_rows(sec.find('table'))

        elif '심화 과제' in sec_title:
            p = sec.find('p')
            data['advancedTask'] = p.decode_contents().strip() if p else None

    return data


def main():
    with open(SRC, encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    os.makedirs(OUT_DIR, exist_ok=True)
    for i, key in enumerate(ORDER, 1):
        data = extract_lesson(soup, key)
        data['sortOrder'] = i
        outpath = os.path.join(OUT_DIR, f"{data['id']}_{key}.json")
        with open(outpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"wrote {outpath}  (objectives={len(data['objectives'])}, "
              f"recordTable={'yes' if data['recordTable'] else 'no'}, "
              f"photo={'yes' if data['photoBlockHtml'] else 'no'})")


if __name__ == '__main__':
    main()
