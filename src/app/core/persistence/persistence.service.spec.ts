import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SnackService } from '../snack/snack.service';
import { DatabaseService } from './database.service';
import { CompressionService } from '../compression/compression.service';
import { PersistenceService } from './persistence.service';
import { TestScheduler } from 'rxjs/testing';
import { of } from 'rxjs';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { provideMockStore } from '@ngrx/store/testing';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { skip } from 'rxjs/operators';
import { DEFAULT_APP_BASE_DATA } from '../../imex/sync/sync.const';

const testScheduler = new TestScheduler((actual, expected) => {
  // asserting the two objects are equal
  expect(actual).toEqual(expected);
});

export const FAKE_APP_DATA: AppDataComplete = {
  ...DEFAULT_APP_BASE_DATA,
  note: {},
  bookmark: {},
  lastLocalSyncModelChange: 1234,
};

describe('PersistenceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: {} }),
        {
          provide: SnackService,
          useValue: {
            open: () => false,
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            clearDatabase: () => false,
            save: () => false,
            remove: () => false,
            load: () => false,
          },
        },
        {
          provide: CompressionService,
          useValue: {
            decompress: () => false,
            compress: () => false,
          },
        },
      ],
    });
  });

  it('database update should trigger onAfterSave$', async (done) => {
    const service: PersistenceService = TestBed.inject(PersistenceService);
    // once is required to fill up data
    await service.loadComplete();
    service.onAfterSave$.subscribe(({ data }) => {
      expect(data).toEqual(createEmptyEntity());
      done();
    });
    service.tag.saveState(createEmptyEntity(), { isSyncModelChange: true });
  });

  describe('inMemoryComplete$', () => {
    it('should start with loadComplete data', () => {
      testScheduler.run(({ expectObservable }) => {
        const FAKE_VAL: any = DEFAULT_APP_BASE_DATA;
        const a$ = of(FAKE_VAL);
        spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => a$ as any);
        const service: PersistenceService = TestBed.inject(PersistenceService);
        expectObservable(service.inMemoryComplete$).toBe('a', { a: FAKE_VAL });
      });
    });

    it('should refresh onAfterSave$', fakeAsync((done) => {
      const service: PersistenceService = TestBed.inject(PersistenceService);
      let ll: any;
      let i = 0;
      service.inMemoryComplete$.subscribe((data) => {
        const l = JSON.stringify(data).length;
        // console.log(i, l, ll);
        if (ll) {
          expect(l).toEqual(ll);
        }
        ll = l;
        if (i === 2) {
          done();
        }
        i++;
      });

      setTimeout(() => {
        service.onAfterSave$.next('' as any);
      });

      setTimeout(() => {
        service.onAfterSave$.next('' as any);
      }, 1);
      tick(51);
    }));

    it('should only propagate valid data', fakeAsync(() => {
      const service: PersistenceService = TestBed.inject(PersistenceService);
      let i = 0;
      spyOn(service, 'loadComplete').and.callFake(() => {
        i++;
        switch (i) {
          case 1:
            return Promise.resolve('BROKEN_FAKE_APP_DATA' as any);
          case 2:
            return Promise.resolve(FAKE_APP_DATA);
        }
        throw new Error('Broken test');
      });

      service.inMemoryComplete$.pipe(skip(1)).subscribe((data) => {
        expect(data).toEqual(FAKE_APP_DATA);
      });

      service.onAfterSave$.next('' as any);
      tick(50);
      service.onAfterSave$.next('' as any);
      tick(50);
    }));

    // it('should refresh onAfterSave$', () => {
    //   testScheduler.run(({expectObservable}) => {
    //     const FAKE_VAL_A: any = 'AAAAAAAAAA';
    //     const a$ = of(FAKE_VAL_A);
    //     const FAKE_VAL_B: any = 'BBBBBBBBBB';
    //     const b$ = of(FAKE_VAL_B);
    //     let j = 0;
    //     spyOn(PersistenceService.prototype, 'loadComplete').and.callFake(() => {
    //       if (j === 0) {
    //         j++;
    //         return a$ as any;
    //       }
    //       return b$ as any;
    //     });
    //
    //     const service: PersistenceService = TestBed.inject(PersistenceService);
    //     service.onAfterSave$.next('B' as any);
    //     setTimeout(() => {
    //       service.onAfterSave$.next('B' as any);
    //     });
    //
    //     setTimeout(() => {
    //       service.onAfterSave$.next('B' as any);
    //     }, 5);
    //     expectObservable(service.inMemoryComplete$).toBe('a', {a: FAKE_VAL_A});
    //   });
    // });
  });

  // it('AAA', () => {
  // });
});
