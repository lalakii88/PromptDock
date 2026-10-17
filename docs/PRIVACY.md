# PromptDock 隐私说明 / Privacy notice

版本：1.4.0；更新日期：2026-10-12。

## 中文

PromptDock 是本地提示词管理扩展，不需要账户，不提供 AI 接口。

**本地处理的数据**：用户主动输入或导入的提示词、标题、说明、标签、分类、模板变量及其说明和示例，收藏状态、创建及更新时间、复制次数和最近使用时间；用户选择的界面语言和主题。用户主动使用网页右键摘录时，扩展接收选中的文字并保存到本机提示词库，不保存网页 URL 或浏览历史。填写变量时的临时值用于生成当前复制结果，不会自动写回原模板。

**存储与用途**：提示词库和界面偏好保存在当前浏览器配置文件的扩展本地存储中，用于保存、检索、分类、模板替换和显示界面。临时会话存储保存用于侧边栏切换的浏览器窗口标识，不保存访问网址。不提供云端同步或账户服务。

**网络与第三方**：扩展没有模型接口、远程代码、广告、分析统计或网页内容脚本，不自动将上述数据发送给开发者或第三方，也不出售或共享用户数据。扩展页面的网络连接被内容安全策略禁用。

**用户主动传递内容**：复制会将所选提示词或填好变量的结果放入系统剪贴板。导出或分享功能生成本机 JSON 文件，导入读取用户选择的 JSON 文件，不自动上传。用户随后将内容粘贴到其他网站或发送文件时，接收方的数据处理规则适用。JSON 备份可能包含敏感内容，请自行选择保存和分享对象。

**管理和删除**：用户可以在界面编辑、删除提示词和管理分类，或导出 JSON 备份。删除分类会将提示词移到「通用」。卸载扩展或清除扩展存储可能删除本机数据；已导出的文件由用户自行管理。升级时会尝试删除旧 AI 版本遗留的 API 设置和会话配置，不读取或传输其中的密钥，不清空提示词库。

本说明对应 1.4.0 的实际功能。若以后增加网络服务或改变数据用途，应先更新说明和相应的商店披露。

## English

PromptDock is a local prompt manager. It requires no account and provides no AI API integration.

**Data processed locally**: prompts, titles, descriptions, tags, categories, template variables and their descriptions/examples entered or imported by the user; favorites, creation/update timestamps, copy counts and last-use timestamps; interface language and theme. When the user chooses the webpage context-menu action, the extension receives the selected text and saves it locally. It does not save webpage URLs or browsing history. Temporary variable values are used for the current copy result and are not automatically written back to the template.

**Storage and purpose**: the library and preferences are kept in the extension's local storage for this browser profile, for saving, searching, organization, template substitution and interface display. Session storage holds a browser window identifier for sidebar routing, without visited URLs. No cloud synchronization or account service is provided.

**Network and third parties**: the extension contains no model API client, remote code, advertisements, analytics or webpage content scripts. It does not automatically send this data to the developer or third parties, or sell or share user data. Its extension-page content security policy blocks network connections.

**User-directed transfers**: copying places a selected prompt or filled result on the system clipboard. Export and share create a local JSON file; import reads a JSON file selected by the user. These actions do not automatically upload data. If the user later pastes content into another website or sends a file, that recipient's data practices apply. Backups may contain sensitive content; the user chooses where to store or share them.

**Control and deletion**: users can edit or delete prompts, manage categories and export backups. Deleting a category moves its prompts to General. Uninstalling the extension or clearing extension storage may remove local data; exported files remain under the user's control. Upgrades attempt to remove API settings and session configuration left by earlier AI-enabled versions without reading or transmitting their keys or clearing the prompt library.

This notice describes version 1.4.0. Future network services or changes in data purposes require updated notices and store disclosures.
