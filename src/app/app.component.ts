import { Component, computed, effect, inject } from '@angular/core';
import { ToDoStore } from './todo.store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'with-paginated-data-service-workspace';
  private store: InstanceType<typeof ToDoStore> = inject(ToDoStore);
  protected totalCount = computed(() => {
    return this.store.todosTotalCount();
  });
  protected pageCount = computed(() => {
    return this.store.todosPageCount();
  });
  protected pageSize = computed(() => {
    return this.store.todosPageSize();
  });
  protected currentPage = computed(() => {
    return this.store.todosCurrentPage();
  });
  constructor() {
    this.store.loadTodosEntities();
    this.store.goToTodosPage(29);
  }
}
