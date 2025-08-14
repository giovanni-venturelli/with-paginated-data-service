import { Injectable } from '@angular/core';
import {  PaginatedDataService } from 'with-paginated-data-service';
import {
  Filter,
  PaginationServiceState,
} from '@angular-architects/ngrx-toolkit';
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
  load(
    filter: TodoFilter,
    pagination: {page: number; pageSize: number}
  ): Promise<{ data: ToDo[]; totalCount: number; pageCount: number }> {
    console.log('Chiamata con seguenti dati');
    console.log(filter);
    console.log(pagination);
    return Promise.resolve({data: [{id: 1, description: 'primo'} as ToDo, {id: 2, description: 'secondo'} as ToDo] as ToDo[], totalCount: 20, pageCount: 2})
  }
  loadById(id: EntityId): Promise<ToDo> {
    throw new Error('Method not implemented.');
  }
  create(entity: ToDo): Promise<ToDo> {
    throw new Error('Method not implemented.');
  }
  update(entity: ToDo): Promise<ToDo> {
    throw new Error('Method not implemented.');
  }
  updateAll(entity: ToDo[]): Promise<ToDo[]> {
    throw new Error('Method not implemented.');
  }
  delete(entity: ToDo): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
