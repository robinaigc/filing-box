# 财报盒子 MVP 开发任务书

## 1. 项目目标

开发一个极简单页网站，名字暂定为：

**财报盒子**

核心功能：

用户输入公司名称、股票代码或中文别名后，网站在当前页面直接显示该公司的全部财报列表，并提供下载入口。

这个网站只做一件事：

**搜索上市公司财报，然后下载财报。**

禁止加入以下内容：

- 新闻
- 行情
- K线
- 研报
- 社区
- 广告
- 投资建议
- 公司分析
- 财务解读
- AI 总结

## 2. 产品形态

整个 MVP 只有一个主要页面：

```txt
/
```

要求：

- 不分页
- 不跳转
- 不做公司详情页
- 不做搜索结果页
- 所有交互都在首页完成

## 3. 首页初始状态

用户打开网站后，只看到以下内容：

```txt
财报盒子

输入公司名或股票代码，直接下载上市公司财报。

只收录官方披露文件。
不提供新闻、行情、研报和投资建议。
```

页面组件：

```txt
1. 网站名称
2. 一句话说明
3. 搜索框
4. 市场筛选
5. 报告类型筛选
6. 年份筛选
7. 热门财报推荐或最近搜索最多财报
```

搜索框 placeholder：

```txt
搜索公司名或股票代码，例如 AAPL、苹果、600519、贵州茅台
```

市场筛选：

```txt
全部
美股
A股
```

报告类型筛选：

```txt
全部
年报
半年报
一季报
三季报
10-K
10-Q
20-F
6-K
40-F
```

年份筛选：

```txt
全部
2026
2025
2024
2023
2022
更早
```

## 4. 搜索后的页面状态

用户输入关键词并搜索后，页面不跳转。

搜索栏下方直接显示结果。

搜索后只允许出现三种状态。

### 4.1 找到唯一公司

显示该公司的全部财报。

标题示例：

```txt
Apple Inc. 财报列表
```

或：

```txt
贵州茅台财报列表
```

标题下方显示：

```txt
已找到 28 份财报，按披露时间倒序排列。
```

### 4.2 没有找到公司

显示：

```txt
没有找到该公司财报，请尝试输入准确股票代码或公司全称。
```

要求：

- 不显示其他公司
- 不显示相关推荐
- 不显示相似公司
- 不显示热门财报

### 4.3 匹配到多个公司

显示：

```txt
找到多个可能公司，请输入更准确的股票代码。
```

要求：

- 不显示多个公司列表
- 不让用户二次选择
- 第一版宁可严格，也不要误判

## 5. 核心搜索逻辑

搜索流程必须是：

```txt
用户输入关键词
↓
系统先识别唯一公司
↓
如果识别成功，根据 company_id 查询该公司的全部财报
↓
如果识别失败，直接显示没有找到
↓
如果匹配多个，提示用户输入更准确股票代码
```

严禁直接用模糊搜索返回一堆公司。

严禁出现以下情况：

```txt
输入“银行”后返回所有银行股
输入“科技”后返回所有科技股
输入“苹果”后返回不相关公司
输入“贵州”后返回所有贵州公司
```

## 6. 中文搜索要求

系统必须支持中文搜索美股公司。

实现方式：

使用 `company_aliases` 中文别名表。

例如：

```txt
AAPL
Apple
Apple Inc.
苹果
苹果公司
苹果电脑
```

这些 alias 都应该指向：

```txt
Apple Inc.
AAPL
US
NASDAQ
```

用户输入：

```txt
苹果
```

必须能显示 Apple Inc. 的全部财报。

用户输入：

```txt
微软
```

必须能显示 Microsoft Corporation 的全部财报。

用户输入：

```txt
英伟达
```

必须能显示 NVIDIA Corporation 的全部财报。

第一版不要依赖 AI 实时猜测用户输入。

第一版必须通过数据库别名表做严格匹配。

## 7. 搜索匹配优先级

搜索匹配顺序如下：

```txt
1. 股票代码完全匹配
2. 公司英文名完全匹配
3. 公司中文名完全匹配
4. 公司简称完全匹配
5. company_aliases 表中的别名完全匹配
6. 大小写忽略匹配
```

如果匹配结果为 0：

返回 `not_found`。

如果匹配结果为 1：

返回该公司的全部财报。

如果匹配结果大于 1：

返回 `ambiguous`。

不要显示多个公司选项。

## 8. 财报结果表格

搜索成功后，表格字段如下：

```txt
公司名称
股票代码
市场
交易所
报告类型
报告期间
报告年份
披露日期
报告标题
来源
官方来源
下载
```

最后一栏必须是下载。

表格按披露日期倒序排列：

```sql
order by filing_date desc, year desc
```

最新财报在最上面。

## 9. 财报类型范围

### 9.1 美股

第一版收录：

```txt
10-K
10-Q
20-F
6-K
40-F
```

说明：

```txt
10-K 通常是美国公司年报
10-Q 通常是美国公司季报
20-F 通常是外国公司在美国上市的年报
6-K 通常是外国公司在美国上市后的披露文件
40-F 通常用于部分加拿大公司
```

第一版暂时不默认收录 8-K，因为 8-K 大量属于重大事项公告，容易污染“财报下载器”的纯度。

后续可以单独增加“更多披露文件”开关。

### 9.2 A股

第一版收录：

```txt
annual
semi_annual
q1
q3
annual_summary
revised_report
```

前端展示映射：

```txt
annual -> 年报
semi_annual -> 半年报
q1 -> 一季报
q3 -> 三季报
annual_summary -> 年报摘要
revised_report -> 修订版财报
```

A股标题识别规则：

```txt
标题包含“年度报告” -> annual
标题包含“半年度报告” -> semi_annual
标题包含“第一季度报告” -> q1
标题包含“第三季度报告” -> q3
标题包含“年度报告摘要” -> annual_summary
标题包含“修订”且属于定期报告 -> revised_report
```

## 10. 下载逻辑

第一版不把 PDF 文件本体存在数据库里。

数据库只保存：

```txt
公司信息
报告标题
报告类型
报告年份
披露日期
官方来源链接
下载链接
```

PDF 文件本体仍然来自官方来源。

用户点击下载时：

```txt
读取 reports 表中的 download_url
↓
通过 /api/download?reportId=xxx 触发下载
↓
能下载 PDF 的下载 PDF
↓
不能下载 PDF 的下载或打开官方原文
```

浏览器是否弹出“选择存储位置窗口”，取决于用户浏览器设置。

开发侧需要尽量通过响应头触发下载：

```txt
Content-Disposition: attachment; filename="report-name.pdf"
```

但不要承诺所有浏览器都会弹出保存位置窗口。

## 11. 数据源

### 11.1 美股数据源

使用 SEC EDGAR 官方数据。

数据入口：

```txt
https://data.sec.gov/submissions/CIK##########.json
```

Apple 示例：

```txt
https://data.sec.gov/submissions/CIK0000320193.json
```

CIK 必须补齐 10 位。

请求必须设置 User-Agent：

```txt
ReportBox contact@example.com
```

请求频率第一版控制为：

```txt
1 request / second
```

不要超过 SEC 的 fair access 限制。

### 11.2 A股数据源

使用巨潮资讯 CNINFO 作为 A股财报来源。

第一版策略：

先手动或半自动导入 10 家 A股种子公司的近 3 年财报链接。

后续再开发自动抓取或申请正式接口。

要求：

- 不高频抓取巨潮
- 每条 A股财报必须保留巨潮官方来源链接
- 每条 A股财报必须保留 PDF 下载链接
- 不抓取无关公告

## 12. 技术栈

使用以下技术栈：

```txt
Next.js
TypeScript
Tailwind CSS
Supabase PostgreSQL
Vercel
Vercel Cron 或 GitHub Actions
```

第一版不要引入复杂搜索引擎。

第一版搜索直接用 PostgreSQL 查询即可。

后续数据量变大后，再考虑 Meilisearch 或 Typesense。

## 13. 数据库设计

### 13.1 companies 表

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  symbol text not null,
  name text not null,
  display_name text,
  exchange text,
  cik text,
  org_id text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

字段说明：

```txt
market: US 或 CN
symbol: AAPL / 600519
name: 公司正式名称
display_name: 前端显示名称
exchange: NASDAQ / NYSE / SSE / SZSE / BSE
cik: 美股 CIK
org_id: 预留给巨潮
```

### 13.2 company_aliases 表

```sql
create table company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  alias text not null,
  language text,
  alias_type text,
  created_at timestamp default now()
);
```

字段说明：

```txt
alias: 用户可能输入的名称
language: en / zh
alias_type: ticker / official_name / short_name / chinese_name / common_name
```

示例：

```txt
AAPL -> Apple Inc.
Apple -> Apple Inc.
Apple Inc. -> Apple Inc.
苹果 -> Apple Inc.
苹果公司 -> Apple Inc.

MSFT -> Microsoft Corporation
Microsoft -> Microsoft Corporation
微软 -> Microsoft Corporation
微软公司 -> Microsoft Corporation

NVDA -> NVIDIA Corporation
NVIDIA -> NVIDIA Corporation
英伟达 -> NVIDIA Corporation
英伟达公司 -> NVIDIA Corporation

600519 -> 贵州茅台
贵州茅台 -> 贵州茅台
茅台 -> 贵州茅台
茅台股份 -> 贵州茅台
```

### 13.3 reports 表

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  market text not null,
  symbol text not null,
  company_name text not null,
  exchange text,
  report_type text not null,
  title text not null,
  year integer,
  period text,
  filing_date date,
  source text not null,
  view_url text,
  download_url text,
  source_url text,
  accession_number text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

字段说明：

```txt
company_id: 对应 companies.id
market: US / CN
symbol: 股票代码
company_name: 公司名称
exchange: 交易所
report_type: 报告类型
title: 报告标题
year: 报告年份
period: FY / Q1 / Q2 / Q3 / H1
filing_date: 披露日期
source: SEC / CNINFO
view_url: 查看链接
download_url: 下载链接
source_url: 官方来源链接
accession_number: SEC 文件编号
```

### 13.4 search_logs 表

```sql
create table search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  normalized_query text,
  market text,
  company_id uuid references companies(id),
  result_status text,
  result_count integer,
  created_at timestamp default now()
);
```

用途：

记录搜索行为。

用于生成热门财报或最近搜索最多财报。

### 13.5 popular_reports 表

第一版可选。

```sql
create table popular_reports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id),
  score integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

## 14. API 设计

### 14.1 按公司搜索财报

```txt
GET /api/reports/by-company?q=xxx&type=all&year=all
```

逻辑：

```txt
1. 接收用户输入 q
2. 清洗 q
3. 查 companies.symbol
4. 查 companies.name
5. 查 companies.display_name
6. 查 company_aliases.alias
7. 判断匹配结果数量
8. 唯一匹配后查询 reports
9. 按 filing_date desc 排序
10. 返回该公司全部财报
```

返回 found：

```json
{
  "status": "found",
  "company": {
    "id": "uuid",
    "name": "Apple Inc.",
    "symbol": "AAPL",
    "market": "US",
    "exchange": "NASDAQ"
  },
  "count": 28,
  "reports": [
    {
      "id": "uuid",
      "companyName": "Apple Inc.",
      "symbol": "AAPL",
      "market": "US",
      "exchange": "NASDAQ",
      "reportType": "10-K",
      "period": "FY",
      "year": 2025,
      "filingDate": "2026-01-31",
      "title": "Apple Inc. 2025 Form 10-K",
      "source": "SEC",
      "sourceUrl": "https://...",
      "downloadUrl": "/api/download?reportId=uuid"
    }
  ]
}
```

返回 not_found：

```json
{
  "status": "not_found",
  "message": "没有找到该公司财报，请尝试输入准确股票代码或公司全称。",
  "reports": []
}
```

返回 ambiguous：

```json
{
  "status": "ambiguous",
  "message": "找到多个可能公司，请输入更准确的股票代码。",
  "reports": []
}
```

### 14.2 热门财报

```txt
GET /api/reports/popular
```

第一版返回种子公司的最新年报。

后续根据 search_logs 计算热度。

返回 10 到 20 条。

### 14.3 下载接口

```txt
GET /api/download?reportId=xxx
```

逻辑：

```txt
1. 根据 reportId 查询 reports
2. 如果 download_url 存在，触发下载
3. 如果 download_url 不存在但 view_url 存在，打开 view_url
4. 如果都不存在，返回错误
```

错误文案：

```txt
该报告暂时没有可下载文件，请打开官方来源查看。
```

### 14.4 同步 SEC 数据

```txt
POST /api/admin/sync-sec
```

需要 `ADMIN_SYNC_TOKEN` 保护。

### 14.5 同步 A股数据

```txt
POST /api/admin/sync-cninfo
```

第一版可以只预留接口。

A股先用种子数据导入。

## 15. SEC 抓取逻辑

### 15.1 美股种子公司

第一版先支持以下公司：

```txt
AAPL Apple Inc.
MSFT Microsoft Corporation
NVDA NVIDIA Corporation
TSLA Tesla, Inc.
AMZN Amazon.com, Inc.
META Meta Platforms, Inc.
GOOGL Alphabet Inc.
BRK-B Berkshire Hathaway Inc.
JPM JPMorgan Chase & Co.
KO The Coca-Cola Company
```

### 15.2 抓取步骤

```txt
1. 从 companies 表读取 market = US 的公司
2. 获取 cik
3. 请求 data.sec.gov/submissions/CIK##########.json
4. 读取 filings.recent
5. 筛选 form 类型
6. 只保留 10-K、10-Q、20-F、6-K、40-F
7. 提取 form、filingDate、reportDate、accessionNumber、primaryDocument
8. 生成 view_url、download_url、source_url
9. 写入 reports 表
10. 去重
```

### 15.3 去重规则

同一公司下：

```txt
company_id + report_type + filing_date + accession_number
```

不得重复写入。

## 16. A股数据逻辑

### 16.1 A股种子公司

第一版先支持：

```txt
600519 贵州茅台
000858 五粮液
300750 宁德时代
002594 比亚迪
600036 招商银行
601318 中国平安
000002 万科A
000651 格力电器
000333 美的集团
688981 中芯国际
```

### 16.2 第一版策略

先手动或半自动导入最近 3 年的定期报告。

每条记录必须包含：

```txt
公司名称
股票代码
市场
交易所
报告类型
报告年份
报告期间
披露日期
报告标题
来源
官方来源链接
下载链接
```

A股 source 固定为：

```txt
CNINFO
```

## 17. 前端交互要求

### 17.1 搜索

支持点击搜索按钮。

支持按 Enter 搜索。

搜索中显示：

```txt
正在搜索财报...
```

### 17.2 初始状态

没有搜索时显示：

```txt
热门财报
```

显示种子公司最新年报。

### 17.3 搜索成功

隐藏热门财报。

显示该公司的财报列表。

### 17.4 搜索失败

显示：

```txt
没有找到该公司财报，请尝试输入准确股票代码或公司全称。
```

不显示热门财报。

不显示其他公司。

### 17.5 匹配多个公司

显示：

```txt
找到多个可能公司，请输入更准确的股票代码。
```

不显示公司列表。

### 17.6 表格

表格字段：

```txt
公司名称
股票代码
市场
交易所
报告类型
报告期间
报告年份
披露日期
报告标题
来源
官方来源
下载
```

官方来源按钮：

```txt
打开
```

下载按钮：

```txt
下载 PDF
```

或：

```txt
下载原文
```

手机端表格允许横向滚动。

## 18. UI 风格

要求：

- 极简
- 黑白灰为主
- 最多一个强调色
- 不要大图
- 不要图标堆砌
- 不要复杂动效
- 不要卡片墙
- 不要资讯流

页面重点是搜索框和财报表格。

## 19. 环境变量

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEC_USER_AGENT=ReportBox contact@example.com
ADMIN_SYNC_TOKEN=
```

## 20. 开发顺序

```txt
1. 创建 Next.js + TypeScript 项目
2. 配置 Tailwind CSS
3. 创建 Supabase 数据表
4. 写入 20 家种子公司
5. 写入 company_aliases 中文别名数据
6. 创建首页 UI
7. 创建热门财报区域
8. 实现 /api/reports/by-company
9. 实现严格公司匹配逻辑
10. 实现搜索成功后的财报表格
11. 实现 not_found 和 ambiguous 状态
12. 实现 /api/download
13. 接入 SEC submissions API
14. 写入美股财报元数据
15. 手动导入 A股种子公司财报数据
16. 实现筛选器
17. 实现 search_logs
18. 部署到 Vercel
19. 添加每日同步任务
20. 写 README
```

## 21. 验收标准

必须满足：

```txt
1. 首页只有搜索框、筛选器和热门财报推荐
2. 输入 AAPL，只显示 Apple Inc. 的财报
3. 输入 苹果，只显示 Apple Inc. 的财报
4. 输入 MSFT，只显示 Microsoft 的财报
5. 输入 微软，只显示 Microsoft 的财报
6. 输入 600519，只显示贵州茅台的财报
7. 输入 贵州茅台，只显示贵州茅台的财报
8. 输入不存在的公司，显示没有找到
9. 输入模糊词，不返回无关公司
10. 搜索结果按披露日期倒序排列
11. 表格包含年报、季报、半年报等定期财报
12. 不跳转页面
13. 不分页
14. 表格最后一栏是下载按钮
15. 每条财报都有官方来源
16. 页面没有新闻、行情、K线、研报、社区、广告
17. 手机端可以正常使用
```

## 22. 第一版不要做的功能

第一版不要做：

```txt
用户登录
收藏
付费系统
AI 总结
财务数据分析
估值分析
K线
股价
新闻
研报
社区
评论
全文 PDF 存储
大规模全市场抓取
```

## 23. 关键提醒

第一版的核心价值是：

```txt
输入公司
看到该公司所有财报
按时间倒序排列
点击下载
```

请优先保证这个闭环稳定。

不要扩展成财经门户。

不要扩展成投资分析平台。

不要扩展成新闻聚合站。

这个项目就是一个极简财报下载器。
