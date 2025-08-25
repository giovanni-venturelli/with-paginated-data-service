import { Component, computed, inject } from '@angular/core';
import { ToDoStore } from './todo.store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'with-paginated-data-service-workspace';
  private store: InstanceType<typeof ToDoStore> = inject(ToDoStore);

  // Expose pagination signals from the store
  protected totalCount = computed(() => this.store.totalTodosCount());
  protected pageCount = computed(() => this.store.todosPageCount());
  protected pageSize = computed(() => this.store.todosPageSize());
  protected currentPage = computed(() => this.store.currentTodosPage());

  // Current page items (already paginated by the store)
  protected todos = computed(() => this.store.todosEntities());

  constructor() {
    // Load first page
    this.store.loadTodosEntities();
  }

  // Paginator actions
  protected goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.pageCount() || 1));
    this.store.goToTodosPage(clamped);
  }

  protected nextPage(): void {
    if (this.currentPage() < (this.pageCount() || 1)) {
      this.store.goToTodosPage(this.currentPage() + 1);
    }
  }

  protected prevPage(): void {
    if (this.currentPage() > 1) {
      this.store.goToTodosPage(this.currentPage() - 1);
    }
  }

  protected changePageSize(size: number): void {
    const s = Math.max(1, Math.floor(size || 1));
    this.store.setTodosPageSize(s);
    // Reset to first page and reload (goToPage triggers load)
    this.store.goToTodosPage(1);
  }

  protected readonly Number = Number;
}
