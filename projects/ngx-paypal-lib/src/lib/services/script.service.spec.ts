import { TestBed } from '@angular/core/testing';

import { ScriptService } from './script.service';

describe('ScriptService', () => {
  let service: ScriptService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScriptService]
    });

    service = TestBed.inject(ScriptService);
  });

  // Ensure no residual PayPal SDK global between tests
  beforeEach(() => {
    delete (window as any)['testGlobal'];
  });

  afterEach(() => {
    // Ensure cleanup removes the script element if any
    service.cleanup('testGlobal');
  });

  it('should register a script and call onReady when the global variable is set', (done) => {
    // Arrange
    const url = 'https://example.com/fake-sdk.js';
    const globalVar = 'testGlobal';

    // Act
    service.registerScript(url, globalVar, () => {
      // Assert - onReady should be called once the global is available
      expect((window as any)[globalVar]).toBeDefined();
      done();
    });

    // Simulate the SDK setting the global variable
    (window as any)[globalVar] = { ok: true };

    // Manually trigger the load event on the script element
    const scriptId = `ngx-paypal-script-elem-${globalVar}`;
    const script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (script) {
      script.dispatchEvent(new Event('load'));
    }
  });

  it('should not append a new script if one with the same id already exists', (done) => {
    // Arrange
    const url = 'https://example.com/fake-sdk.js';
    const globalVar = 'testGlobal';
    // Pre-declare scriptId for later assertions
    const scriptId = `ngx-paypal-script-elem-${globalVar}`;

    // Make sure the global variable is clear before this test runs
    delete (window as any)[globalVar];

    // Spy on <head>.appendChild to track script insertions
    const head = document.getElementsByTagName('head')[0];
    const appendSpy = spyOn(head, 'appendChild').and.callThrough();

    // First registration (noop onReady)
    service.registerScript(url, globalVar, () => {});

    // After first registration, exactly one script should have been appended
    expect(appendSpy.calls.count()).toBe(1);
    expect((appendSpy.calls.mostRecent().args[0] as HTMLScriptElement).id).toBe(scriptId);

    // Simulate SDK setting global and dispatch load for first script
    (window as any)[globalVar] = { ok: true };
    const firstScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (firstScript) {
      firstScript.dispatchEvent(new Event('load'));
    }

    // Second registration – should NOT append a new script
    service.registerScript(url, globalVar, () => {
      expect(appendSpy.calls.count()).toBe(1);
      done();
    });
  });

  it('cleanup should remove the script element and delete the global variable', () => {
    // Arrange
    const url = 'https://example.com/fake-sdk.js';
    const globalVar = 'testGlobal';
    service.registerScript(url, globalVar, () => {});

    // Simulate SDK setting global and loading
    (window as any)[globalVar] = { ok: true };
    const script = document.getElementById(`ngx-paypal-script-elem-${globalVar}`) as HTMLScriptElement | null;
    if (script) {
      script.dispatchEvent(new Event('load'));
    }

    // Act
    service.cleanup(globalVar);

    // Assert
    const removedScript = document.getElementById(`ngx-paypal-script-elem-${globalVar}`);
    expect(removedScript).toBeNull();
  });
});
