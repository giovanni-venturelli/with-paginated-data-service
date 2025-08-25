import { signalStore, type } from '@ngrx/signals';
import { withCallState, withDevtools } from '@angular-architects/ngrx-toolkit';
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
