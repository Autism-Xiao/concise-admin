export { cn } from 'cn'

// 分页页码生成：页数少时全展示，页数多时用省略号折叠中间部分
export function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  const maxVisible = 5
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | '...')[] = [1]
  if (currentPage > 3) pages.push('...')
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (currentPage < totalPages - 2) pages.push('...')
  pages.push(totalPages)
  return pages
}
