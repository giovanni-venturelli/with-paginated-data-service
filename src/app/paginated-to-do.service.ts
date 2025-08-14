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
