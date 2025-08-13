#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "polib",
#   "langconv"
# ]
# ///

import re
import polib
from langconv.converter import LanguageConverter
from langconv.language.zh import zh_cn

lc_cn = LanguageConverter.from_language(zh_cn)

with open("app/locales/zh-Hant/messages.po", "r") as f:
    po = polib.pofile(f.read())

TW_TO_CN = {
    # Computer words
    "搜尋": "搜索",
    "使用者": "用户",
    "載入": "加载",
    "設定": "设置",
    "登入": "登录",
    "套用": "应用",
    # "Convention"
    "活動": "大会",
}

TW_TO_CN_RE = re.compile("|".join(re.escape(term) for term in TW_TO_CN))


def convert(s):
    return lc_cn.convert(TW_TO_CN_RE.sub(lambda x: TW_TO_CN[x.group(0)], entry.msgstr))


po.metadata["Language"] = "zh-Hans"

for entry in po:
    entry.msgstr = convert(entry.msgstr)

with open("app/locales/zh-Hans/messages.po", "w") as f:
    f.write(str(po))
