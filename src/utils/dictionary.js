const SITE_TITLE = '無何有書齋'

export const DICTIONARY = {
  siteTitle: SITE_TITLE,
  bookshelf: {
    title: `📚 ${SITE_TITLE}` ,
    description: '極簡閱讀空間',
    searchPlaceholder: '搜尋書名或作者...',
    emptyMessage: '書架上空空如也，或是找不到對應的書籍。',
    bookCount: (visible, total) => `顯示 ${visible} / ${total} 本藏書`,
    authorPrefix: '作者：',
    continueReading: '📖 繼續閱讀',
    notStarted: '✨ 尚未開始',
  },
  reader: {
    close: '👈 返回',
    loadingTitle: '載入中',
    loadingBook: '正在開啟書籍...',
    loadingChapter: '⏳ 正在翻開下一章...',
    chapterListClose: '關閉章節列表',
    chapterListOpen: '開啟章節列表',
    chapterListLabel: '章節列表',
    previousPage: '👈 上一章',
    nextPage: '下一章 👉',
    previousImagePage: '👆',
    nextImagePage: '👇',
  },
  errors: {
    bookListLoad: '無法載入全站書單',
    bookTocLoad: '無法載入該書目錄',
    chapterLoad: '章節載入失敗',
    chapterLoadMessage: '❌ 本章節載入失敗',
  },
  theme: {
    switchToLight: '切換至淺色主題',
    switchToDark: '切換至深色主題',
  },
   accessDenied: '存取受限 (Access Denied)'
};