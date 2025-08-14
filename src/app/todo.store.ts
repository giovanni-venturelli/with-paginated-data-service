import {  signalStore, type } from '@ngrx/signals';
import {
  withCallState,
  withDevtools,
  withPagination,
} from '@angular-architects/ngrx-toolkit';
import { withEntities } from '@ngrx/signals/entities';
import { withPaginatedDataService } from 'with-paginated-data-service';
import { ToDo, TodoService } from './paginated-to-do.service';

export const ToDoStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<ToDo>(), collection: 'todos' }),
  withCallState({ collection: 'todos' }),
  withPaginatedDataService({
    collection: 'todos',
    filter: { ids: [] as number[] },
    dataServiceType: TodoService,
  }),
  withDevtools('TODOSTORE')
);
