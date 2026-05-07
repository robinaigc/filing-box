# 财报盒子 / 财报一搜 终版开发任务书 v1.0

## 0. 给 Codex 的执行原则

请严格按照本任务书执行。

第一轮只完成「阶段一：本地数据版可运行 MVP」。

不要在第一轮直接接入 SEC、巨潮、Supabase、Vercel Cron。

第一轮目标是先做出一个稳定、可运行、无路由跳转、无分页的单页财报搜索下载 Demo。

第二阶段再接真实数据源和数据库。

这样做的原因：

1. 单页 UI、搜索逻辑、中文别名匹配、表格展示、下载交互必须先跑通。
2. SEC 和巨潮属于真实数据源，存在接口、限流、链接格式、网络环境等变量。
3. 第一轮同时做前端、数据库、真实数据抓取，容易出现大量无关 bug。
4. 本任务书要求先把产品闭环做稳，再把数据源替换成真实来源。

第一轮交付物必须可以本地运行。

## 1. 项目名称

项目中文名：

**财报盒子**

备用名：

**财报一搜**

第一版页面标题使用：

**财报盒子**

## 2. 项目目标

开发一个极简单页网站。

用户输入公司名称、股票代码、中文简称或英文名称后，网站在当前页面直接显示该公司的全部财报列表，并提供下载入口。

产品只做一件事：

**搜索上市公司财报，并提供下载或官方来源入口。**

第一版使用本地 seed 数据。

第二阶段再接入 SEC EDGAR、巨潮资讯 CNINFO、Supabase 数据库。

## 3. 第一版必须避免的内容

第一版不要做：

- 新闻
- 行情
- K 线
- 研报
- 社区
- 广告
- 投资建议
- 公司分析
- 财务解读
- AI 总结
- 用户登录
- 收藏
- 付费系统
- 大规模真实数据抓取
- 全文 PDF 存储
- 多页面路由
- 公司详情页
- 搜索结果页
- 分页

## 4. 技术方案

第一阶段使用：

```txt
Next.js
TypeScript
Tailwind CSS
本地 seed 数据
```

第一阶段不要使用：

```txt
Supabase
数据库
真实 SEC API
真实巨潮抓取
后端定时任务
复杂搜索引擎
```

项目结构建议：

```txt
app/
  page.tsx
  globals.css

components/
  SearchBar.tsx
  FilterBar.tsx
  PopularReports.tsx
  ReportTable.tsx
  StatusMessage.tsx
  ThemeToggle.tsx

lib/
  repository.ts
  search.ts
  normalize.ts
  types.ts

data/
  companies.ts
  reports.ts
  aliases.ts
```

要求：

- 只保留一个页面 `/`
- 所有内容都在首页完成
- 搜索后不跳转
- 不分页
- 搜索结果直接显示在搜索栏下方
- 支持移动端
- 支持暗黑模式

数据访问要求：

- 阶段一虽然使用本地 seed 数据，但页面和搜索逻辑不要直接散落读取 `data/*.ts`
- 通过 `lib/repository.ts` 统一封装数据访问
- 阶段一默认数据源为 `local`
- 后续阶段可在 repository 层替换为 Supabase，而不重写页面交互
- 阶段一不要实现真实 Supabase 查询，只保留清晰的数据访问边界

## 5. 页面结构

页面从上到下：

```txt
1. 顶部区域：英文品牌名 Filing Box + 中文网站名称 + 暗黑模式切换按钮
2. 简短说明
3. 大搜索栏
4. 筛选器
5. 初始状态：最近披露推荐
6. 搜索后状态：该公司财报表格
```

首页文案：

```txt
Filing Box

财报盒子

输入公司名或股票代码，直接下载上市公司财报。

只收录官方披露文件。
不提供新闻、行情、研报和投资建议。
```

搜索框 placeholder：

```txt
搜索公司名或股票代码，例如 AAPL、苹果、600519、贵州茅台
```

## 6. UI 风格要求

整体风格调整为：

- 极简数据工作台风格
- 干净、安静、专业
- 搜索优先
- 具有官方财报文件库气质
- 黑白灰为主
- 最多使用一个低饱和强调色
- 支持暗黑模式
- 桌面端居中布局
- 移动端适配良好
- 表格在手机端允许横向滚动
- 字体要现代、清晰、克制，避免系统默认控件带来的老旧感
- 控件应统一圆角、边框、间距、hover 与选中状态

第一版允许加入轻量动态内容，但动态内容必须服务于“官方财报检索与下载”这一核心目标。

允许出现：

- 搜索框聚焦、输入、搜索中的轻量状态动效
- 报告类型标签流，例如 `10-K`、`10-Q`、`年报`、`半年报`
- 极淡的数据网格、时间线或文件库感背景
- 最近披露列表的细微 hover 或状态变化
- 暗黑模式下克制的数据终端质感
- 自定义筛选下拉菜单，菜单面板、选项字体、hover 和选中态与整体 UI 保持一致

不要出现：

- 大图
- 花哨图标
- 复杂动效
- 卡片墙
- 资讯流
- 股票行情组件
- 广告位
- 新闻模块
- 投资建议
- AI 分析或财务解读
- Windows / Win95 风格的原生下拉菜单质感

页面不能扩展成财经门户、行情站、新闻聚合站或投资分析平台。

## 7. 初始状态

用户刚打开页面，没有搜索时，搜索栏下方显示：

```txt
最近披露
```

最近披露显示 6 条。

每条推荐显示：

```txt
公司名称
股票代码
市场
报告类型
报告年份
披露日期
下载
```

点击最近披露中的公司名称或整条记录，可以自动填入搜索框并展示该公司的全部财报。

## 8. 搜索后的状态

用户输入关键词并搜索后，页面不跳转。

搜索栏下方直接显示结果。

搜索后只允许出现三种状态。

### 8.1 找到唯一公司

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
已找到 6 份财报，按披露时间倒序排列。
```

然后显示财报表格。

### 8.2 没有找到公司

显示：

```txt
没有找到该公司财报，请尝试输入准确股票代码或公司全称。
```

要求：

- 不显示其他公司
- 不显示相似公司
- 不显示相关推荐
- 不显示最近披露

### 8.3 匹配到多个公司

显示：

```txt
找到多个可能公司，请输入更准确的股票代码。
```

要求：

- 不显示多个公司列表
- 不让用户二次选择
- 第一版宁可严格，也不要误判

## 9. 核心搜索原则

搜索必须先识别唯一公司，再展示该公司的所有财报。

搜索流程：

```txt
用户输入关键词
↓
清洗关键词
↓
查询股票代码、公司名、英文名、中文别名
↓
判断是否匹配到唯一公司
↓
如果唯一匹配，返回该公司全部财报
↓
如果没有匹配，显示没有找到
↓
如果匹配多个，显示输入更准确股票代码
```

严禁直接用宽泛模糊搜索返回多个公司。

严禁出现以下情况：

```txt
输入“银行”后返回所有银行股
输入“科技”后返回所有科技股
输入“苹果”后返回不相关公司
输入“贵州”后返回所有贵州公司
输入“能源”后返回所有能源公司
```

## 10. 搜索匹配规则

第一版采用严格匹配加有限别名匹配。

匹配优先级：

```txt
1. 股票代码完全匹配
2. 公司代码完全匹配
3. 公司英文名完全匹配
4. 公司中文名完全匹配
5. 公司简称完全匹配
6. aliases 表中的别名完全匹配
7. 大小写忽略匹配
8. 去除空格、标点后的等值匹配
```

不要使用普通 includes 模糊搜索直接决定公司。

可以使用 includes 做辅助，但只有在最终能确定唯一公司时才返回。

例如：

```txt
输入 AAPL -> Apple Inc.
输入 Apple -> Apple Inc.
输入 苹果 -> Apple Inc.
输入 苹果公司 -> Apple Inc.
输入 MSFT -> Microsoft Corporation
输入 微软 -> Microsoft Corporation
输入 600519 -> 贵州茅台
输入 贵州茅台 -> 贵州茅台
```

不允许：

```txt
输入 苹果 -> 同时返回 Apple Hospitality、Apple Inc. 等多个公司
输入 贵州 -> 返回贵州茅台、贵州燃气等多个公司
```

## 11. 中文搜索要求

系统必须支持中文搜索美股公司。

第一版通过本地 aliases 数据实现。

示例：

```txt
AAPL
Apple
Apple Inc.
苹果
苹果公司
苹果电脑
```

都指向：

```txt
Apple Inc.
AAPL
美股
NASDAQ
```

示例：

```txt
MSFT
Microsoft
Microsoft Corporation
微软
微软公司
```

都指向：

```txt
Microsoft Corporation
MSFT
美股
NASDAQ
```

示例：

```txt
NVDA
NVIDIA
NVIDIA Corporation
英伟达
英伟达公司
辉达
```

都指向：

```txt
NVIDIA Corporation
NVDA
美股
NASDAQ
```

第一版不要依赖 AI 实时猜测。

第一版不要调用翻译 API。

第一版只使用本地别名表。

## 12. 本地数据结构

### 12.1 Company 类型

```ts
export type Company = {
  id: string;
  market: "US" | "CN";
  symbol: string;
  code?: string;
  name: string;
  displayName: string;
  exchange: string;
};
```

说明：

```txt
US 公司使用 symbol，例如 AAPL
CN 公司使用 symbol 或 code，例如 600519
displayName 用于页面展示
market 只允许 US 或 CN
```

### 12.2 Alias 类型

```ts
export type CompanyAlias = {
  companyId: string;
  alias: string;
  language: "en" | "zh";
  aliasType: "ticker" | "code" | "official_name" | "short_name" | "common_name";
};
```

### 12.3 Report 类型

```ts
export type Report = {
  id: string;
  companyId: string;
  companyName: string;
  market: "US" | "CN";
  symbol: string;
  exchange: string;
  reportType: string;
  period: "FY" | "Q1" | "Q2" | "Q3" | "H1" | "OTHER";
  year: number;
  filingDate: string;
  title: string;
  source: "SEC" | "CNINFO" | "MOCK";
  sourceUrl: string;
  downloadUrl: string;
};
```

## 13. 第一版种子公司

第一版至少包含 6 家公司。

美股：

```txt
AAPL Apple Inc. 苹果
MSFT Microsoft Corporation 微软
NVDA NVIDIA Corporation 英伟达
TSLA Tesla, Inc. 特斯拉
```

A股：

```txt
600519 贵州茅台
300750 宁德时代
```

每家公司至少 5 条财报。

每家公司报告类型必须覆盖：

美股：

```txt
10-K
10-Q
```

A股：

```txt
年报
半年报
一季报
三季报
```

## 14. 第一版本地 seed 数据要求

请在 `data/companies.ts`、`data/aliases.ts`、`data/reports.ts` 中写入数据。

不要把大量 mock 数据直接塞进 `page.tsx`。

### 14.1 companies.ts 示例结构

```ts
import type { Company } from "@/lib/types";

export const companies: Company[] = [
  {
    id: "apple",
    market: "US",
    symbol: "AAPL",
    name: "Apple Inc.",
    displayName: "Apple Inc.",
    exchange: "NASDAQ"
  },
  {
    id: "kweichow-moutai",
    market: "CN",
    symbol: "600519",
    code: "600519",
    name: "贵州茅台酒股份有限公司",
    displayName: "贵州茅台",
    exchange: "SSE"
  }
];
```

### 14.2 aliases.ts 示例结构

```ts
import type { CompanyAlias } from "@/lib/types";

export const aliases: CompanyAlias[] = [
  { companyId: "apple", alias: "AAPL", language: "en", aliasType: "ticker" },
  { companyId: "apple", alias: "Apple", language: "en", aliasType: "short_name" },
  { companyId: "apple", alias: "Apple Inc.", language: "en", aliasType: "official_name" },
  { companyId: "apple", alias: "苹果", language: "zh", aliasType: "common_name" },
  { companyId: "apple", alias: "苹果公司", language: "zh", aliasType: "common_name" },
  { companyId: "kweichow-moutai", alias: "600519", language: "zh", aliasType: "code" },
  { companyId: "kweichow-moutai", alias: "贵州茅台", language: "zh", aliasType: "short_name" },
  { companyId: "kweichow-moutai", alias: "茅台", language: "zh", aliasType: "common_name" }
];
```

### 14.3 reports.ts 要求

每条 report 必须有：

```txt
id
companyId
companyName
market
symbol
exchange
reportType
period
year
filingDate
title
source
sourceUrl
downloadUrl
```

第一版可以使用示例链接。

如果没有可靠下载链接，则 downloadUrl 允许为空字符串。

downloadUrl 为空时，前端下载按钮应显示为禁用状态，并提示：

```txt
暂无下载链接，请打开官方来源查看。
```

不要伪造看似真实但无法访问的链接。

## 15. 财报表格字段

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

表格按披露日期倒序排列：

```ts
reports.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())
```

最后一栏必须是下载。

## 16. 下载逻辑

第一版下载逻辑：

```txt
如果 downloadUrl 存在：
  点击下载按钮，使用 <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
如果 downloadUrl 不存在：
  下载按钮禁用
  按钮文案显示“暂无下载”
```

注意：

浏览器是否弹出“另存为”窗口，取决于用户浏览器设置。

前端不能保证所有浏览器都弹出保存位置选择窗口。

不要在页面文案中承诺“一定弹出另存为窗口”。

## 17. 官方来源逻辑

每条财报必须有官方来源按钮。

如果 sourceUrl 存在：

```txt
按钮文案：打开
点击后新标签页打开 sourceUrl
```

如果 sourceUrl 不存在：

```txt
按钮禁用
按钮文案：暂无来源
```

## 18. 筛选器

第一版提供三个筛选器：

```txt
市场：全部 / 美股 / A股
报告类型：全部 / 年报 / 半年报 / 一季报 / 三季报 / 10-K / 10-Q / 20-F / 6-K / 40-F
年份：全部 / 2026 / 2025 / 2024 / 2023 / 2022 / 更早
```

筛选器 UI 要求：

```txt
1. 不使用浏览器原生 select 下拉菜单作为最终视觉形态
2. 使用自定义下拉控件
3. 触发按钮需与页面整体圆角、边框、字体、暗色模式一致
4. 下拉菜单选项必须清晰可读
5. 选中项和 hover 状态要有明确但克制的视觉反馈
6. 暗黑模式下不能出现浅色文字叠在浅色菜单上的问题
```

筛选器只对已经搜索到的该公司财报生效。

筛选器不要用于查找其他公司。

例如：

用户搜索“苹果”后，筛选器只筛选 Apple Inc. 的财报。

## 19. 最近披露推荐

初始状态显示 6 条最近披露。

第一版最近披露规则：

```txt
从每家公司最新一条年报或最近报告中取 6 条
按 filingDate 倒序展示
```

最近披露点击行为：

```txt
点击公司名称或推荐卡片
↓
搜索框自动填入该公司 displayName
↓
直接显示该公司的全部财报
```

## 20. 搜索状态提示

必须实现以下状态：

### 20.1 初始状态

显示最近披露。

### 20.2 搜索中

显示：

```txt
正在搜索财报...
```

本地数据搜索很快，也请保留短暂 loading 状态或条件渲染。

### 20.3 搜索成功

显示：

```txt
已找到 X 份财报，按披露时间倒序排列。
```

### 20.4 没有找到

显示：

```txt
没有找到该公司财报，请尝试输入准确股票代码或公司全称。
```

### 20.5 匹配多个

显示：

```txt
找到多个可能公司，请输入更准确的股票代码。
```

### 20.6 筛选后无财报

显示：

```txt
该公司在当前筛选条件下暂无财报。
```

## 21. 搜索函数要求

请在 `lib/search.ts` 中实现核心搜索逻辑。

建议函数：

```ts
export type SearchResult =
  | { status: "found"; company: Company; reports: Report[] }
  | { status: "not_found"; message: string }
  | { status: "ambiguous"; message: string };

export function searchCompanyReports(query: string): SearchResult;
```

搜索函数必须：

```txt
1. trim 用户输入
2. 统一大小写
3. 去除多余空格
4. 在 companies 和 aliases 中查找
5. 找到唯一 companyId 后返回该公司全部 reports
6. 找不到返回 not_found
7. 多个 companyId 返回 ambiguous
8. 不返回其他公司财报
```

## 22. normalize 函数要求

请在 `lib/normalize.ts` 中实现：

```ts
export function normalizeQuery(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[.,，。·•\-_/\\]/g, "");
}
```

所有公司名、别名、代码匹配前都应使用 normalizeQuery 进行标准化。

## 23. 暗黑模式要求

实现一个暗黑模式切换按钮。

要求：

```txt
1. 默认跟随系统主题
2. 用户点击后可切换 light / dark
3. 可以使用 localStorage 保存选择
4. 不要引入复杂主题库
5. 切换按钮显示当前主题状态
```

如果实现复杂，可以先用 Tailwind dark class 完成。

## 24. 移动端要求

移动端要求：

```txt
1. 搜索框宽度自适应
2. 筛选器可以换行，自定义下拉菜单在移动端仍需可读
3. 财报表格允许横向滚动
4. 字号清晰
5. 下载按钮可点击
```

不要为了移动端删减表格关键字段。

## 25. 错误处理

必须处理：

```txt
1. 空搜索
2. 搜索不到
3. 匹配多个
4. 找到公司但没有财报
5. 下载链接为空
6. 官方来源为空
```

空搜索时显示：

```txt
请输入公司名或股票代码。
```

## 26. 阶段一验收标准

阶段一完成后，必须满足以下测试。

### 26.1 页面测试

```txt
1. 打开首页，能看到 Filing Box、财报盒子、说明、搜索框、筛选器、最近披露
2. 页面没有新闻、行情、K线、研报、广告
3. 页面无分页
4. 页面无路由跳转
5. 暗黑模式可切换
6. 手机端可正常浏览
7. 筛选器不是系统原生老旧下拉菜单，展开后选项清晰可读
8. 页面具有克制的轻动态数据工作台质感
```

### 26.2 搜索测试

```txt
1. 输入 AAPL，只显示 Apple Inc. 的财报
2. 输入 苹果，只显示 Apple Inc. 的财报
3. 输入 苹果公司，只显示 Apple Inc. 的财报
4. 输入 MSFT，只显示 Microsoft Corporation 的财报
5. 输入 微软，只显示 Microsoft Corporation 的财报
6. 输入 NVDA，只显示 NVIDIA Corporation 的财报
7. 输入 英伟达，只显示 NVIDIA Corporation 的财报
8. 输入 600519，只显示贵州茅台的财报
9. 输入 贵州茅台，只显示贵州茅台的财报
10. 输入 300750，只显示宁德时代的财报
11. 输入 宁德时代，只显示宁德时代的财报
12. 输入 银行，不返回银行股列表
13. 输入 科技，不返回科技股列表
14. 输入 不存在的公司，显示没有找到
```

### 26.3 表格测试

```txt
1. 财报按披露日期倒序排列
2. 表格最后一栏是下载
3. 每条财报有官方来源按钮
4. downloadUrl 为空时下载按钮禁用
5. sourceUrl 为空时官方来源按钮禁用
6. 筛选器只筛选当前公司财报
```

## 27. 阶段二：真实数据扩展方向

阶段一完成并通过验收后，第二阶段再做真实数据。

第二阶段不要影响阶段一已有功能。

阶段二开始前，先完成数据库 schema 与数据访问层准备：

```txt
1. 保持页面和搜索交互不变
2. 通过 lib/repository.ts 替换数据来源
3. 本地数据源仍作为 fallback
4. Supabase schema 先以 migration 文件形式提交
5. 真实抓取和同步任务在 schema 稳定后再实现
```

当前 migration 文件：

```txt
supabase/migrations/20260506182500_initial_filing_box_schema.sql
```

Supabase 安全要求：

```txt
1. public schema 下的表必须启用 RLS
2. 需要通过 Data API 读取的表必须显式 grant select 给 anon / authenticated
3. search_logs 只允许公开 insert，不允许公开 select
4. service_role 可用于后端同步任务写入和维护数据
5. 不在前端暴露 service_role key
```

### 27.1 数据库

第二阶段可引入：

```txt
Supabase PostgreSQL
```

数据库表：

```txt
companies
company_aliases
reports
search_logs
popular_reports
```

### 27.2 companies 表

```sql
create table companies (
  id text primary key,
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

### 27.3 company_aliases 表

```sql
create table company_aliases (
  id bigint generated always as identity primary key,
  company_id text references companies(id),
  alias text not null,
  language text,
  alias_type text,
  created_at timestamp default now()
);
```

### 27.4 reports 表

```sql
create table reports (
  id text primary key,
  company_id text references companies(id),
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

### 27.5 search_logs 表

```sql
create table search_logs (
  id bigint generated always as identity primary key,
  query text not null,
  normalized_query text,
  market text,
  company_id text references companies(id),
  result_status text,
  result_count integer,
  created_at timestamp default now()
);
```

## 28. 阶段二：真实 API 设计

第二阶段可增加以下接口：

```txt
GET /api/reports/by-company?q=xxx&type=all&year=all
GET /api/reports/popular
GET /api/download?reportId=xxx
POST /api/admin/sync-sec
POST /api/admin/sync-cninfo
```

注意：

阶段一不要实现这些真实接口。

阶段一先用本地函数模拟。

## 29. 阶段二：美股数据源

第二阶段使用 SEC EDGAR 官方数据。

数据入口：

```txt
https://data.sec.gov/submissions/CIK##########.json
```

Apple 示例：

```txt
https://data.sec.gov/submissions/CIK0000320193.json
```

要求：

```txt
1. CIK 补齐 10 位
2. 请求必须设置 User-Agent
3. 第一版真实抓取控制为 1 request / second
4. 不超过 SEC fair access 限制
5. 只抓取 10-K、10-Q、20-F、6-K、40-F
6. 去重后写入 reports 表
```

SEC User-Agent 示例：

```txt
ReportBox contact@example.com
```

当前项目使用：

```txt
FilingBox robin990083@gmail.com
```

SEC 同步脚本：

```txt
scripts/sync-sec.ts
```

脚本要求：

```txt
1. 需要 NEXT_PUBLIC_SUPABASE_URL
2. 需要 SUPABASE_SERVICE_ROLE_KEY
3. 需要 SEC_USER_AGENT
4. 支持通过 --symbol=AAPL 先同步单家公司
5. 默认只同步 companies 表中有 cik 的美股公司
```

当前 SEC 同步状态：

```txt
1. 当前 7 家美股 seed 公司已完成 SEC 同步
2. Supabase 中美股旧示例数据已清理
3. 美股搜索结果优先展示真实 SEC 数据
4. A股仍暂时使用 seed 数据，等待巨潮 CNINFO 导入
```

当前 CNINFO 同步状态：

```txt
1. 当前 5 家 A股 seed 公司已完成 CNINFO 同步
2. Supabase 中 A股旧示例数据已清理
3. A股搜索结果展示真实 CNINFO PDF 链接
4. CNINFO 查询必须使用 symbol + org_id 精确定位，不能只用关键词
```

当前部署状态：

```txt
1. GitHub 仓库已发布：https://github.com/robinaigc/filing-box
2. Vercel 生产环境已发布：https://filing-box.vercel.app
3. Vercel 生产环境已配置 Supabase public 环境变量
4. 生产域名公开可访问，随机 hashed deployment URL 可能仍显示 Vercel Authentication
5. PDF 文件仍不存储在 Supabase，线上只通过官方 source_url/download_url 跳转到 SEC 或 CNINFO
```

当前美股扩展状态：

```txt
1. 已新增 SEC 公司池同步脚本：scripts/sync-sec-companies.ts
2. 公司池来源：SEC 官方 https://www.sec.gov/files/company_tickers_exchange.json
3. 当前已导入前 2000 家美股公司到 Supabase companies 表
4. 当前已缓存 21394 条 SEC 财报元数据
5. 新增公司会写入 ticker、官方英文名、交易所、CIK 和英文 aliases
6. 已有 seed 公司按 symbol 复用原 id，避免破坏 Apple、Microsoft、NVIDIA 等已有别名和展示名
7. 已新增最近披露重建脚本：scripts/rebuild-recent-reports.ts
8. 同步后已重建 recent_reports，首页最近披露可展示最新 SEC 财报
9. 仍不存储 PDF 文件本体，只保存 SEC 官方 HTML/PDF 文件 URL
10. scripts/sync-sec-companies.ts 支持 --offset 与 --limit，用于分批导入公司池
11. scripts/sync-sec.ts 支持 --offset 与 --limit，用于分批同步财报
12. 已新增 SEC 同步状态表 migration：supabase/migrations/20260507040500_add_sec_sync_runs.sql
13. scripts/sync-sec.ts 会按公司记录 success / empty / failed、同步数量、错误信息和批次参数
14. 如果 sec_sync_runs 表尚未应用到 Supabase，财报同步不会中断，只会输出状态日志写入警告
15. 已新增 SEC 同步状态查询脚本：scripts/sec-sync-status.ts
16. 当前 sec_sync_runs 已记录 1005 条同步状态，其中 success 955、empty 50、failed 0
17. 已新增 SEC 覆盖率报表脚本：scripts/sec-sync-coverage.ts
18. 覆盖率报表按每家公司最新同步状态统计，而不是按日志行数统计
19. 当前覆盖率报表显示：total 2000、latestSuccess 956、latestEmpty 50、latestFailed 0、missingSyncStatus 994、withReports 1135、SEC reports 21394
20. 已演进到“热门预同步 + 长尾按需同步”方案：前端搜索走 /api/search
21. /api/search 命中美股公司但无缓存财报时，会服务端按需拉取 SEC 最新 filings，并写入 reports 与 sec_sync_runs
22. 按需同步已用 AAL 验证成功：AAL 从 missing 变为 success，新增 20 条 SEC 财报元数据
23. /api/search 已加入 24 小时 TTL：最近 success / empty / failed 都不会重复打 SEC
24. /api/search 已修复 Supabase 默认 1000 行限制，companies 和 aliases 均分页读取，支持当前 2000 家公司池搜索
```

## 30. 阶段二：A股数据源

第二阶段使用巨潮资讯 CNINFO。

策略：

```txt
1. 先手动或半自动导入 A股种子公司的近 3 年财报
2. 不高频抓取巨潮
3. 每条 A股财报保留巨潮官方来源链接
4. 每条 A股财报保留 PDF 下载链接
5. 不抓取无关公告
```

A股种子公司：

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

## 31. 阶段二：下载接口逻辑

真实版本下载逻辑：

```txt
读取 reports 表中的 download_url
↓
如果 download_url 存在，触发下载或打开文件
↓
如果 download_url 不存在但 sourceUrl 存在，打开官方来源
↓
如果都不存在，显示错误
```

错误文案：

```txt
该报告暂时没有可下载文件，请打开官方来源查看。
```

不要把 PDF 文件本体存在数据库里。

数据库只存：

```txt
公司信息
报告标题
报告类型
报告年份
披露日期
官方来源链接
下载链接
```

## 32. 最终提醒

第一阶段的核心闭环是：

```txt
输入公司
识别唯一公司
看到该公司的所有财报
按时间倒序排列
点击下载或打开官方来源
```

请优先保证这个闭环稳定。

不要扩展成财经门户。

不要扩展成投资分析平台。

不要扩展成新闻聚合站。

这个项目第一阶段就是一个极简、可运行、可扩展的单页财报下载器。
