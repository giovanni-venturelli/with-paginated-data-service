import { computed, inject, ProviderToken, signal, Signal } from '@angular/core';
import {
  EmptyFeatureResult,
  patchState,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import {
  addEntity,
  EntityId,
  EntityState,
  NamedEntityState,
  setAllEntities,
  updateEntity,
} from '@ngrx/signals/entities';
import {
  CallState,
  Entity,
  Filter,
  getCallStateKeys,
  NamedCallStateSlice,
  setError,
  setLoaded,
  setLoading,
} from '@angular-architects/ngrx-toolkit';

export interface PaginatedDataService<E extends Entity, F extends Filter> {
  load(
    filter: F,
    pagination: {
      page: number;
      pageSize: number;
    }
  ): Promise<{ data: E[]; totalCount: number; pageCount: number }>;

  loadById(id: EntityId): Promise<E>;

  create(entity: E): Promise<E>;

  update(entity: E): Promise<E>;

  updateAll(entity: E[]): Promise<E[]>;

  delete(filter: F): Promise<void>;
}

export function capitalize(str: string): string {
  return str ? str[0].toUpperCase() + str.substring(1) : str;
}

export function getDataServiceKeys(options: { collection?: string }) {
  const goToPageKey = options.collection
    ? `goTo${capitalize(options.collection)}Page`
    : `goToPage`;
  const setPageSizeKey = options.collection
    ? `set${capitalize(options.collection)}PageSize`
    : `setPageSize`;
  const pageCountKey = options.collection
    ? `${options.collection}PageCount`
    : `pageCount`;
  const totalCountKey = options.collection
    ? `${options.collection}TotalCount`
    : `totalCount`;
  const currentPageKey = options.collection
    ? `${options.collection}CurrentPage`
    : `currentPage`;
  const pageSizeKey = options.collection
    ? `${options.collection}PageSize`
    : `pageSize`;
  const filterKey = options.collection
    ? `${options.collection}Filter`
    : 'filter';
  const selectedIdsKey = options.collection
    ? `selected${capitalize(options.collection)}Ids`
    : 'selectedIds';
  const selectedEntitiesKey = options.collection
    ? `selected${capitalize(options.collection)}Entities`
    : 'selectedEntities';

  const updateFilterKey = options.collection
    ? `update${capitalize(options.collection)}Filter`
    : 'updateFilter';
  const updateSelectedKey = options.collection
    ? `updateSelected${capitalize(options.collection)}Entities`
    : 'updateSelected';
  const loadKey = options.collection
    ? `load${capitalize(options.collection)}Entities`
    : 'load';

  const currentKey = options.collection
    ? `current${capitalize(options.collection)}`
    : 'current';
  const loadByIdKey = options.collection
    ? `load${capitalize(options.collection)}ById`
    : 'loadById';
  const setCurrentKey = options.collection
    ? `setCurrent${capitalize(options.collection)}`
    : 'setCurrent';
  const createKey = options.collection
    ? `create${capitalize(options.collection)}`
    : 'create';
  const updateKey = options.collection
    ? `update${capitalize(options.collection)}`
    : 'update';
  const updateAllKey = options.collection
    ? `updateAll${capitalize(options.collection)}`
    : 'updateAll';
  const deleteKey = options.collection
    ? `delete${capitalize(options.collection)}`
    : 'delete';

  // TODO: Take these from @ngrx/signals/entities, when they are exported
  const entitiesKey = options.collection
    ? `${options.collection}Entities`
    : 'entities';
  const entityMapKey = options.collection
    ? `${options.collection}EntityMap`
    : 'entityMap';
  const idsKey = options.collection ? `${options.collection}Ids` : 'ids';

  return {
    filterKey,
    selectedIdsKey,
    selectedEntitiesKey,
    updateFilterKey,
    updateSelectedKey,
    loadKey,
    currentPageKey,
    pageSizeKey,
    entitiesKey,
    entityMapKey,
    idsKey,
    pageCountKey,
    totalCountKey,
    currentKey,
    loadByIdKey,
    setCurrentKey,
    createKey,
    updateKey,
    updateAllKey,
    deleteKey,
    goToPageKey,
    setPageSizeKey,
  };
}

export type NamedPaginatedDataServiceState<
  E extends Entity,
  F extends Filter,
  Collection extends string
> = {
  [K in Collection as `${K}Filter`]: F;
} & {
  [K in Collection as `selected${Capitalize<K>}Ids`]: Record<EntityId, boolean>;
} & {
  [K in Collection as `current${Capitalize<K>}`]: E | undefined;
};

export type PaginatedDataServiceState<E extends Entity, F extends Filter> = {
  filter: F;
  selectedIds: Record<EntityId, boolean>;
  current: E | undefined;
};

export type PaginatedDataServiceComputed<E extends Entity> = {
  selectedEntities: Signal<E[]>;
  CurrentPage:Signal<number>;
  TotalCount:Signal<number>;
  PageSize:Signal<number>;
  PageCount:Signal<number>;
};

export type NamedPaginatedDataServiceComputed<
  E extends Entity,
  Collection extends string
> = {
  [K in Collection as `selected${Capitalize<K>}Entities`]: Signal<E[]>;
} &  {
  [K in Collection as  `${K}CurrentPage`]: Signal<number>;
} &  {
  [K in Collection as  `${K}TotalCount`]: Signal<number>;
} &  {
  [K in Collection as  `${K}PageSize`]: Signal<number>;
} &  {
  [K in Collection as  `${K}PageCount`]: Signal<number>;
};

export type NamedPaginatedDataServiceMethods<
  E extends Entity,
  F extends Filter,
  Collection extends string
> = {
  [K in Collection as `update${Capitalize<K>}Filter`]: (filter: F) => void;
} & {
  [K in Collection as `updateSelected${Capitalize<K>}Entities`]: (
    id: EntityId,
    selected: boolean
  ) => void;
} & {
  [K in Collection as `load${Capitalize<K>}Entities`]: () => Promise<void>;
} & {
  [K in Collection as `setCurrent${Capitalize<K>}`]: (entity: E) => void;
} & {
  [K in Collection as `load${Capitalize<K>}ById`]: (
    id: EntityId
  ) => Promise<void>;
} & {
  [K in Collection as `create${Capitalize<K>}`]: (entity: E) => Promise<void>;
} & {
  [K in Collection as `update${Capitalize<K>}`]: (entity: E) => Promise<void>;
} & {
  [K in Collection as `updateAll${Capitalize<K>}`]: (
    entity: E[]
  ) => Promise<void>;
} & {
  [K in Collection as `delete${Capitalize<K>}`]: (filter: F) => Promise<void>;
} & {
  [K in Collection as `goTo${Capitalize<K>}Page`]: (page: number) => Promise<void>;
} & {
  [K in Collection as `set${Capitalize<K>}PageSize`]: (pageSize: number) => void;
};

export type PaginatedDataServiceMethods<E extends Entity, F extends Filter> = {
  updateFilter: (filter: F) => void;
  updateSelected: (id: EntityId, selected: boolean) => void;
  load: () => Promise<void>;

  setCurrent(entity: E): void;
  loadById(id: EntityId): Promise<void>;
  create(entity: E): Promise<void>;
  update(entity: E): Promise<void>;
  updateAll(entities: E[]): Promise<void>;
  delete(filter: F): Promise<void>;
  goToPage(page: number): Promise<void>;
  setPageSize(pageSize: number): void;
};

export function withPaginatedDataService<
  E extends Entity,
  F extends Filter,
  Collection extends string
>(options: {
  dataServiceType: ProviderToken<PaginatedDataService<E, F>>;
  filter: F;
  collection: Collection;
  pageSize?: number;
}): SignalStoreFeature<
  SignalStoreFeatureResult,
  {
    state: NamedPaginatedDataServiceState<E, F, Collection>;
    props: NamedPaginatedDataServiceComputed<E, Collection>;
    methods: NamedPaginatedDataServiceMethods<E, F, Collection>;
  }
>;
export function withPaginatedDataService<
  E extends Entity,
  F extends Filter
>(options: {
  dataServiceType: ProviderToken<PaginatedDataService<E, F>>;
  filter: F;
  collection: string;
  pageSize?: number;
}): SignalStoreFeature<
  SignalStoreFeatureResult,
  {
    state: NamedPaginatedDataServiceState<E, F, string>;
    props: NamedPaginatedDataServiceComputed<E, string>;
    methods: NamedPaginatedDataServiceMethods<E, F, string>;
  }
>;
export function withPaginatedDataService<
  E extends Entity,
  F extends Filter
>(options: {
  dataServiceType: ProviderToken<PaginatedDataService<E, F>>;
  filter: F;
  pageSize?: number;
}): SignalStoreFeature<
  SignalStoreFeatureResult,
  {
    state: PaginatedDataServiceState<E, F>;
    props: PaginatedDataServiceComputed<E>;
    methods: PaginatedDataServiceMethods<E, F>;
  }
>;

export function withPaginatedDataService<
  E extends Entity,
  F extends Filter,
  Collection extends string
>(options: {
  dataServiceType: ProviderToken<PaginatedDataService<E, F>>;
  filter: F;
  collection?: Collection;
  pageSize?: number;
}): /* eslint-disable @typescript-eslint/no-explicit-any */
  SignalStoreFeature<any, any> {
  const { dataServiceType, filter, collection: prefix } = options;
  const {
    entitiesKey,
    filterKey,
    loadKey,
    currentPageKey,
    pageSizeKey,
    selectedEntitiesKey,
    selectedIdsKey,
    updateFilterKey,
    updateSelectedKey,
    totalCountKey,
    pageCountKey,
    currentKey,
    createKey,
    updateKey,
    updateAllKey,
    deleteKey,
    loadByIdKey,
    setCurrentKey,
    goToPageKey,
    setPageSizeKey,
  } = getDataServiceKeys(options);
  const { callStateKey } = getCallStateKeys({ collection: prefix });
  // Use distinct internal state keys for prefixed pagination values to avoid overriding computed members
  const currentPageStateKey = prefix ? `${currentPageKey}` : currentPageKey;
  const pageSizeStateKey = prefix ? `${pageSizeKey}` : pageSizeKey;
  const totalCountStateKey = prefix ? `${totalCountKey}` : totalCountKey;
  const pageCountStateKey = prefix ? `${pageCountKey}` : pageCountKey;

  return signalStoreFeature(
    withState({
      [filterKey]: filter,
      [selectedIdsKey]: {} as Record<EntityId, boolean>,
      [currentKey]: undefined as E | undefined,
      [currentPageStateKey]: 1,
      [pageSizeStateKey]: options.pageSize ?? 15,
      [totalCountStateKey]: 0,
      [pageCountStateKey]: 0
    }),
    withComputed((store: Record<string, unknown>) => {
      const entities = store[entitiesKey] as Signal<E[]>;
      const selectedIds = store[selectedIdsKey] as Signal<
        Record<EntityId, boolean>
      >;
      // Create capitalized/named computed keys to expose pagination values in DevTools without colliding with state keys
      const currentPageComputedKey = prefix ? `${prefix}CurrentPage` : 'CurrentPage';
      const totalCountComputedKey = prefix ? `${prefix}TotalCount` : 'TotalCount';
      const pageSizeComputedKey = prefix ? `${prefix}PageSize` : 'PageSize';
      const pageCountComputedKey = prefix ? `${prefix}PageCount` : 'PageCount';

      return {
        [selectedEntitiesKey]: computed(() =>
          entities().filter((e) => selectedIds()[e.id])
        ),
        [currentPageComputedKey]: computed(() => (store[currentPageStateKey] as Signal<number>)()),
        [totalCountComputedKey]: computed(() => (store[totalCountStateKey] as Signal<number>)()),
        [pageSizeComputedKey]: computed(() => (store[pageSizeStateKey] as Signal<number>)()),
        [pageCountComputedKey]: computed(() => (store[pageCountStateKey] as Signal<number>)()),
      };
    }),
    withMethods(
      (store: Record<string, unknown> & WritableStateSource<object>) => {
        const dataService = inject(dataServiceType);
        const doLoad = async (): Promise<void> => {
          const filter = store[filterKey] as Signal<F>;
          const currentPage = store[currentPageStateKey] as Signal<number>;
          const pageSize = store[pageSizeStateKey] as Signal<number>;
          (() =>
            store[callStateKey] && patchState(store, setLoading(prefix)))();
          try {
            const result = await dataService.load(filter(), {
              page: currentPage(),
              pageSize: pageSize(),
            });
            patchState(
              store,
              {
                [totalCountStateKey]: result.totalCount,
                [pageCountStateKey]: result.pageCount,
              },
              prefix
                ? setAllEntities(result.data, { collection: prefix })
                : setAllEntities(result.data)
            );
            (() =>
              store[callStateKey] && patchState(store, setLoaded(prefix)))();
          } catch (e) {
            (() =>
              store[callStateKey] && patchState(store, setError(e, prefix)))();
            throw e;
          }
        };
        return {
          [updateFilterKey]: (filter: F): void => {
            patchState(store, { [filterKey]: filter });
          },
          [updateSelectedKey]: (id: EntityId, selected: boolean): void => {
            patchState(store, (state: Record<string, unknown>) => ({
              [selectedIdsKey]: {
                ...(state[selectedIdsKey] as Record<EntityId, boolean>),
                [id]: selected,
              },
            }));
          },
          [loadKey]: async (): Promise<void> => {
            const filter = store[filterKey] as Signal<F>;
            const currentPage = store[currentPageStateKey] as Signal<number>;
            const pageSize = store[pageSizeStateKey] as Signal<number>;
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();
            try {
              const result = await dataService.load(filter(), {
                page: currentPage(),
                pageSize: pageSize(),
              });
              patchState(
                store,
                {
                  [totalCountStateKey]: result.totalCount,
                  [pageCountStateKey]: result.pageCount,
                },
                prefix
                  ? setAllEntities(result.data, { collection: prefix })
                  : setAllEntities(result.data)
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [goToPageKey]: async (page: number): Promise<void> => {
            patchState(store, { [currentPageStateKey]: page });
            return await doLoad();
          },
          [setPageSizeKey]: (pageSize: number): void => {
            patchState(store, { [pageSizeStateKey]: pageSize });
          },
          [loadByIdKey]: async (id: EntityId): Promise<void> => {
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const current = await dataService.loadById(id);
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
              patchState(store, { [currentKey]: current });
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [setCurrentKey]: (current: E): void => {
            patchState(store, { [currentKey]: current });
          },
          [createKey]: async (entity: E): Promise<void> => {
            patchState(store, { [currentKey]: entity });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const created = await dataService.create(entity);
              patchState(store, { [currentKey]: created });
              patchState(
                store,
                prefix
                  ? addEntity(created, { collection: prefix })
                  : addEntity(created)
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [updateKey]: async (entity: E): Promise<void> => {
            patchState(store, { [currentKey]: entity });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const updated = await dataService.update(entity);
              patchState(store, { [currentKey]: updated });

              const updateArg = {
                id: updated.id,
                changes: updated,
              };

              const updater = (collection: string) =>
                updateEntity(updateArg, { collection });

              patchState(
                store,
                prefix ? updater(prefix) : updateEntity(updateArg)
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [updateAllKey]: async (entities: E[]): Promise<void> => {
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const result = await dataService.updateAll(entities);
              patchState(
                store,
                prefix
                  ? setAllEntities(result, { collection: prefix })
                  : setAllEntities(result)
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [deleteKey]: async (filter: F): Promise<void> => {
            // Clear current and perform deletion by filter, then reload to reflect changes
            patchState(store, { [currentKey]: undefined });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              await dataService.delete(filter);
              // After deleting by filter (potentially multiple entities), reload current page
              await doLoad();
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
        };
      }
    )
  );
}
