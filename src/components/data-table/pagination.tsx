import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, getPageNumbers } from '@/lib/utils'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  className?: string
}

export function DataTablePagination<TData>({ table, className }: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div className={cn('flex flex-col-reverse items-center justify-between gap-4 px-2 sm:flex-row', className)}>
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground hidden text-sm sm:block">每页行数</p>
        <Select value={`${table.getState().pagination.pageSize}`} onValueChange={value => table.setPageSize(Number(value))}>
          <SelectTrigger className="h-8 w-17.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 50].map(pageSize => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-muted-foreground text-sm">
          第 {currentPage} / {totalPages} 页
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" className="hidden size-8 p-0 sm:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">第一页</span>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button variant="outline" className="size-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">上一页</span>
            <ChevronLeft className="size-4" />
          </Button>
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === '...' ? (
              <span key={`ellipsis-${index}`} className="text-muted-foreground px-1 text-sm">
                ...
              </span>
            ) : (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? 'default' : 'outline'}
                className="h-8 min-w-8 px-2"
                onClick={() => table.setPageIndex(pageNumber - 1)}
              >
                {pageNumber}
              </Button>
            )
          )}
          <Button variant="outline" className="size-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <span className="sr-only">下一页</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 p-0 sm:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">最后一页</span>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
