import { Injectable, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signalStore, type } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import {
  withPaginatedDataService,
  PaginatedDataService,
} from './with-paginated-data-service';
import { Filter, withCallState } from '@angular-architects/ngrx-toolkit';

interface Item { id: number; name: string }
interface ItemFilter extends Filter { ids: number[] }

@Injectable({ providedIn: 'root' })
class MockService implements PaginatedDataService<Item, ItemFilter> {
  private items: Item[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  private nextId = this.items.length + 1;

  async load(filter: ItemFilter, pagination: { page: number; pageSize: number }) {
    const ids = (filter?.ids ?? []).filter((x) => typeof x === 'number');
    const filtered = ids.length ? this.items.filter((t) => ids.includes(t.id)) : this.items.slice();

    const totalCount = filtered.length;
    const pageSize = Math.max(1, Math.floor(pagination?.pageSize ?? 15));
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(Math.max(1, Math.floor(pagination?.page ?? 1)), pageCount);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);
    return { data, totalCount, pageCount };
  }

  async loadById(id: number): Promise<Item> {
    const found = this.items.find((t) => t.id === Number(id));
    if (!found) throw new Error('not found');
    return { ...found };
  }

  async create(entity: Item): Promise<Item> {
    const id = entity?.id && !this.items.some((t) => t.id === entity.id) ? Number(entity.id) : this.nextId++;
    const created: Item = { id, name: entity?.name ?? '' };
    this.items.push(created);
    return { ...created };
  }

  async update(entity: Item): Promise<Item> {
    const idx = this.items.findIndex((t) => t.id === entity.id);
    if (idx === -1) throw new Error('not found');
    const updated: Item = { ...this.items[idx], ...entity };
    this.items[idx] = updated;
    return { ...updated };
  }

  async updateAll(entities: Item[]): Promise<Item[]> {
    const results: Item[] = [];
    for (const e of entities ?? []) {
      const idx = this.items.findIndex((t) => t.id === e.id);
      if (idx === -1) {
        const id = e?.id && !this.items.some((t) => t.id === e.id) ? Number(e.id) : this.nextId++;
        const created: Item = { id, name: e?.name ?? '' };
        this.items.push(created);
        results.push({ ...created });
      } else {
        const updated: Item = { ...this.items[idx], ...e };
        this.items[idx] = updated;
        results.push({ ...updated });
      }
    }
    return results;
  }

  async delete(filter: ItemFilter): Promise<void> {
    const ids = (filter?.ids ?? []).filter((x) => typeof x === 'number');
    if (!ids.length) return;
    const set = new Set(ids);
    this.items = this.items.filter((t) => !set.has(t.id));
  }
}

// Unprefixed store (no collection)
export const ItemsStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<Item>() }),
  withPaginatedDataService<Item, ItemFilter>({ dataServiceType: MockService, filter: { ids: [] }, pageSize: 10 })
);

// Prefixed store (with collection)
export const ThingsStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<Item>(), collection: 'things' }),
  withCallState({ collection: 'things' }),
  withPaginatedDataService<Item, ItemFilter>({ dataServiceType: MockService, filter: { ids: [] }, collection: 'things', pageSize: 8 })
);

describe('withPaginatedDataService feature', () => {
  let service: MockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MockService] });
    service = TestBed.inject(MockService);
  });

  describe('unprefixed store', () => {
    it('should expose pagination computed signals and load paginated data', async () => {
      const store = TestBed.inject(ItemsStore);
      // Initial values
      expect(typeof store['PageSize']).toBe('function');
      expect(typeof store['PageCount']).toBe('function');
      expect(typeof store['TotalCount']).toBe('function');
      expect(typeof store['CurrentPage']).toBe('function');

      expect(store['PageSize']()).toBe(10);
      expect(store['CurrentPage']()).toBe(1);
      expect(store['TotalCount']()).toBe(0);
      expect(store['PageCount']()).toBe(0);

      // Load first page
      const loadSpy = jest.spyOn(service, 'load');
      await store['load']();
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(store.entities().length).toBe(10);
      expect(store['TotalCount']()).toBe(30);
      expect(store['PageCount']()).toBe(3);
      expect(store['CurrentPage']()).toBe(1);
      // First item should be id 1
      expect(store.entities()[0].id).toBe(1);
    });

    it('should change page with goToPage and reload data', async () => {
      const store = TestBed.inject(ItemsStore);
      await store['load']();
      expect(store.entities()[0].id).toBe(1);

      const loadSpy = jest.spyOn(service, 'load');
      await store['goToPage'](2);
      // extra call performed by goToPage
      expect(loadSpy).toHaveBeenCalled();
      expect(store['CurrentPage']()).toBe(2);
      expect(store.entities().length).toBe(10);
      expect(store.entities()[0].id).toBe(11);
    });

    it('should update page size without auto-loading and then load on goToPage', async () => {
      const store = TestBed.inject(ItemsStore);
      const loadSpy = jest.spyOn(service, 'load');
      await store['load']();
      const firstIdsBefore = store.entities().map(e => e.id);

      store['setPageSize'](7);
      // Should not auto-load
      expect(loadSpy).toHaveBeenCalledTimes(1); // only from initial load
      // Data unchanged until explicit navigation
      expect(store.entities().map(e => e.id)).toEqual(firstIdsBefore);

      await store['goToPage'](1);
      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(store['PageSize']()).toBe(7);
      expect(store.entities().length).toBe(7);
      expect(store.entities()[0].id).toBe(1);
    });

    it('should delete by filter and reload page data and counts', async () => {
      const store = TestBed.inject(ItemsStore);
      await store['load']();

      const deleteSpy = jest.spyOn(service, 'delete');
      const loadSpy = jest.spyOn(service, 'load');

      await store['delete']({ ids: [1, 2, 3] });

      expect(deleteSpy).toHaveBeenCalledWith({ ids: [1, 2, 3] });
      // delete triggers a reload via doLoad
      expect(loadSpy).toHaveBeenCalled();
      expect(store['TotalCount']()).toBe(27);
      expect(store['PageCount']()).toBe(Math.ceil(27 / store['PageSize']()));
      // First page should now start from id 4
      expect(store.entities()[0].id).toBe(4);
    });

    it('should loadById and set current', async () => {
      const store = TestBed.inject(ItemsStore);
      await store['loadById'](5);
      expect(store['current']()?.id).toBe(5);
    });
  });

  describe('prefixed (collection) store', () => {
    it('should expose named methods and computed signals', async () => {
      const store = TestBed.inject(ThingsStore);

      // Check presence of generated API
      expect(typeof store['loadThingsEntities']).toBe('function');
      expect(typeof store['goToThingsPage']).toBe('function');
      expect(typeof store['setThingsPageSize']).toBe('function');
      expect(typeof store['deleteThings']).toBe('function');
      expect(typeof store['thingsCurrentPage']).toBe('function');
      expect(typeof store['thingsTotalCount']).toBe('function');
      expect(typeof store['thingsPageSize']).toBe('function');
      expect(typeof store['thingsPageCount']).toBe('function');

      await store['loadThingsEntities']();
      expect(store.thingsEntities().length).toBe(8);
      expect(store['thingsTotalCount']()).toBe(30);
      expect(store['thingsPageCount']()).toBe(Math.ceil(30 / 8));

      await store['goToThingsPage'](2);
      expect(store['thingsCurrentPage']()).toBe(2);
      expect(store.thingsEntities()[0].id).toBe(9);
    });
  });
});
