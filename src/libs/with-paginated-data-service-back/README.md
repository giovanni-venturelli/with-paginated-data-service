# with-paginated-data-service #
This is an extension feature to the NgRx Signals Store.

It is heavily based on the with-data-service feature from @angular-architects/ngrx-toolkit and provides the possibility to receive the pagination data from
the server.
Here an example of how to use it:

install:
```
npm install with-paginated-data-service
```
store:

```typescript
import { signalStore, type, withState } from '@ngrx/signals';
import {
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import { withEntities } from '@ngrx/signals/entities';
import { withPaginatedDataService } from 'with-paginated-data-service';
import { ToDo, TodoService } from './paginated-to-do.service';

export const ToDoStore = signalStore(
  { providedIn: 'root' },
  withDevtools('TODOSTORE'),
  withEntities({ entity: type<ToDo>(), collection: 'todos' }),
  withCallState({ collection: 'todos' }),
  withPaginatedDataService({
    collection: 'todos',
    filter: { ids: [] as number[] },
    dataServiceType: TodoService,
  }),
);
```

service:

```typescript
import { Injectable } from '@angular/core';
import { PaginatedDataService } from 'with-paginated-data-service';
import { Filter } from '@angular-architects/ngrx-toolkit';
import { EntityId } from '@ngrx/signals/entities';

export interface ToDo {
  id: number;
  description: string;
}

export interface TodoFilter extends Filter {
  ids: number[];
}

@Injectable({
  providedIn: 'root',
})
export class TodoService implements PaginatedDataService<ToDo, TodoFilter> {
  // In-memory mock database
  private todos: ToDo[] = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    description: `Todo #${i + 1}`,
  }));

  private nextId = this.todos.length + 1;

  async load(
    filter: TodoFilter,
    pagination: { page: number; pageSize: number }
  ): Promise<{ data: ToDo[]; totalCount: number; pageCount: number }> {
    // Apply filtering by ids if provided; otherwise return all
    const ids = (filter?.ids ?? []).filter((x) => typeof x === 'number');
    const filtered = ids.length > 0
      ? this.todos.filter((t) => ids.includes(t.id))
      : this.todos.slice();

    // Pagination
    const totalCount = filtered.length;
    const pageSize = Math.max(1, Math.floor(pagination?.pageSize ?? 15));
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(Math.max(1, Math.floor(pagination?.page ?? 1)), pageCount);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);

    return Promise.resolve({ data, totalCount, pageCount });
  }

  async loadById(id: EntityId): Promise<ToDo> {
    const numId = Number(id);
    const found = this.todos.find((t) => t.id === numId);
    if (!found) {
      return Promise.reject(new Error(`ToDo with id ${id} not found`));
    }
    return Promise.resolve({ ...found });
  }

  async create(entity: ToDo): Promise<ToDo> {
    const id = entity?.id && !this.todos.some((t) => t.id === entity.id)
      ? Number(entity.id)
      : this.nextId++;
    const created: ToDo = { id, description: entity?.description ?? '' };
    this.todos.push(created);
    return Promise.resolve({ ...created });
  }

  async update(entity: ToDo): Promise<ToDo> {
    const idx = this.todos.findIndex((t) => t.id === entity.id);
    if (idx === -1) {
      return Promise.reject(new Error(`Cannot update. ToDo with id ${entity.id} not found`));
    }
    const updated: ToDo = { ...this.todos[idx], ...entity };
    this.todos[idx] = updated;
    return Promise.resolve({ ...updated });
  }

  async updateAll(entities: ToDo[]): Promise<ToDo[]> {
    const results: ToDo[] = [];
    for (const e of entities ?? []) {
      const idx = this.todos.findIndex((t) => t.id === e.id);
      if (idx === -1) {
        // Upsert behavior: add if not existing
        const id = e?.id && !this.todos.some((t) => t.id === e.id)
          ? Number(e.id)
          : this.nextId++;
        const created: ToDo = { id, description: e?.description ?? '' };
        this.todos.push(created);
        results.push({ ...created });
      } else {
        const updated: ToDo = { ...this.todos[idx], ...e };
        this.todos[idx] = updated;
        results.push({ ...updated });
      }
    }
    return Promise.resolve(results);
  }

  async delete(filter: TodoFilter): Promise<void> {
    const ids = (filter?.ids ?? []).filter((x) => typeof x === 'number');
    if (ids.length === 0) {
      // Nothing to delete if no ids provided; resolve without error
      return Promise.resolve();
    }
    const before = this.todos.length;
    const idsSet = new Set(ids);
    this.todos = this.todos.filter((t) => !idsSet.has(t.id));
    // Resolve regardless of whether any item was removed to keep idempotency
    return Promise.resolve();
  }
}

```

component:

```typescript
import { Component, computed, inject } from '@angular/core';
import { ToDoStore } from './todo.store';

@Component({
  selector: 'app-root',
  template: `<h1>Todos (paginated)</h1>

<div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem;">
  <div>
    <button (click)="prevPage()" [disabled]="currentPage() <= 1">Prev</button>
    <span style="margin: 0 0.5rem;">
      Page {{ currentPage() }} / {{ pageCount() || 1 }}
    </span>
    <button (click)="nextPage()" [disabled]="currentPage() >= (pageCount() || 1)">Next</button>
  </div>

  <div>
    <label>
      Page size:
      <select [value]="pageSize()" (change)="changePageSize(Number($any($event.target).value))">
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="15">15</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </select>
    </label>
  </div>

  <div>Total items: {{ totalCount() }}</div>
</div>

<div>
  @if ((totalCount() ?? 0) === 0) {
    <p>No todos.</p>
  } @else {
    <ul>
      @for (t of todos(); track t.id) {
        <li>
          <span>{{ t.id }}.</span>
          <span> {{ t.description }} </span>
        </li>
      }
    </ul>
  }
</div>`,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'with-paginated-data-service-workspace';
  private store: InstanceType<typeof ToDoStore> = inject(ToDoStore);

  // Expose pagination signals from the store
  protected totalCount = computed(() => this.store.todosTotalCount());
  protected pageCount = computed(() => this.store.todosPageCount());
  protected pageSize = computed(() => this.store.todosPageSize());
  protected currentPage = computed(() => this.store.todosCurrentPage());

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
    this.store.goToTodosPage(1);
  }

  protected readonly Number = Number;
}

```

NgRx Toolkit is a set of extensions to the NgRx Signals Store, like

- Devtools: Integration into Redux Devtools
- Redux: Possibility to use the Redux Pattern (Reducer, Actions, Effects)
- Storage Sync: Synchronize the Store with Web Storage
- Redux Connector: Map NgRx Store Actions to a present Signal Store

For a more detailed guide on installation, setup, and usage, of NgRx Toolkit head to the [**Documentation
**](https://ngrx-toolkit.angulararchitects.io//).

