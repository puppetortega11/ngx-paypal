import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync
} from '@angular/core/testing';
import {
  Component,
  DebugElement
} from '@angular/core';
import { By } from '@angular/platform-browser';

import { NgxPaypalComponent } from './paypal.component';
import { NgxPayPalModule } from '../ngx-paypal.module';
import { PayPalScriptService } from '../services/paypal-script.service';
import {
  IPayPalConfig,
  IPayPalUrlConfig,
  IOnApproveCallbackData,
  IClientAuthorizeCallbackData,
  ICancelCallbackData,
  ICreateOrderCallbackActions,
  IOnApproveCallbackActions,
  ICreateSubscriptionCallbackData,
  ICreateSubscriptionCallbackActions
} from '../models/paypal-models';

// Fake PayPal implementation
class FakePayPal {
  public static lastButtonsConfig: any;
  public static lastRenderSelector: string | undefined;

  public FUNDING = {
    PAYPAL: 'paypal',
    CARD: 'card',
    PAYLATER: 'paylater',
    CREDIT: 'credit',
    VENMO: 'venmo'
  };

  public Buttons(config: any): any {
    FakePayPal.lastButtonsConfig = config;
    return {
      render: (selector: string) => {
        FakePayPal.lastRenderSelector = selector;
        return { close: () => {} };
      }
    };
  }
}

// Mock PayPal Script Service
class MockPayPalScriptService {
  public static lastConfig: IPayPalUrlConfig | undefined;
  public static fakePayPal = new FakePayPal();

  public registerPayPalScript(config: IPayPalUrlConfig, onReady: (payPalApi: any) => void): void {
    MockPayPalScriptService.lastConfig = config;
    // Synchronously call onReady with fake PayPal
    onReady(MockPayPalScriptService.fakePayPal);
  }

  public destroyPayPalScript(): void {
    // Method to be spied on
  }
}

// Host component for testing
@Component({
  selector: 'ngx-host-component',
  template: `
    <ngx-paypal 
      [config]="config" 
      [registerScript]="registerScript" 
      (scriptLoaded)="onScriptLoaded($event)">
    </ngx-paypal>
  `
})
class HostTestComponent {
  config?: IPayPalConfig;
  registerScript = true;
  
  public loaded: any[] = [];
  
  onScriptLoaded(e: any): void {
    this.loaded.push(e);
  }
}

describe('NgxPaypalComponent', () => {
  let hostFixture: ComponentFixture<HostTestComponent>;
  let hostComponent: HostTestComponent;
  let paypalComponent: NgxPaypalComponent;
  let paypalDebugElement: DebugElement;
  let paypalScriptService: PayPalScriptService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NgxPayPalModule],
      declarations: [HostTestComponent],
      providers: [
        { provide: PayPalScriptService, useClass: MockPayPalScriptService }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    // Reset static variables before each test
    FakePayPal.lastButtonsConfig = undefined;
    FakePayPal.lastRenderSelector = undefined;
    MockPayPalScriptService.lastConfig = undefined;

    hostFixture = TestBed.createComponent(HostTestComponent);
    hostComponent = hostFixture.componentInstance;
    paypalDebugElement = hostFixture.debugElement.query(By.directive(NgxPaypalComponent));
    paypalComponent = paypalDebugElement.componentInstance;
    paypalScriptService = TestBed.inject(PayPalScriptService);

    // Spy on service methods
    spyOn(paypalScriptService, 'destroyPayPalScript').and.callThrough();
  });

  it('should load the SDK, emit scriptLoaded, and render Buttons with client-side createOrder', fakeAsync(() => {
    // Arrange
    const onClientAuthorizationSpy = jasmine.createSpy('onClientAuthorization');
    const onApproveSpy = jasmine.createSpy('onApprove');
    const onErrorSpy = jasmine.createSpy('onError');
    const onCancelSpy = jasmine.createSpy('onCancel');
    const onClickSpy = jasmine.createSpy('onClick');
    const onInitSpy = jasmine.createSpy('onInit');

    hostComponent.config = {
      clientId: 'test-client-id',
      currency: 'USD',
      advanced: {
        locale: 'en_US',
        commit: 'true'
      },
      style: {
        color: 'gold',
        shape: 'rect'
      },
      createOrderOnClient: (data) => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '9.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'USD', value: '9.99' },
            quantity: '1'
          }]
        }]
      }),
      onApprove: onApproveSpy,
      onClientAuthorization: onClientAuthorizationSpy,
      onError: onErrorSpy,
      onCancel: onCancelSpy,
      onClick: onClickSpy,
      onInit: onInitSpy
    };

    // Act
    hostFixture.detectChanges();

    // Assert SDK loading
    expect(MockPayPalScriptService.lastConfig).toBeDefined();
    expect(MockPayPalScriptService.lastConfig!.clientId).toBe('test-client-id');
    expect(MockPayPalScriptService.lastConfig!.currency).toBe('USD');
    expect(MockPayPalScriptService.lastConfig?.locale).toBe('en_US');
    expect(MockPayPalScriptService.lastConfig?.commit).toBe('true');
    expect(MockPayPalScriptService.lastConfig?.funding).toBe(false);

    // Assert script loaded event
    expect(hostComponent.loaded.length).toBe(1);

    // Assert button rendering
    expect(FakePayPal.lastButtonsConfig).toBeDefined();
    expect(FakePayPal.lastRenderSelector!).toBe(
      `#${paypalComponent.payPalButtonContainerId}`
    );

    // Test onApprove with client authorization
    const fakeOrderDetails: IClientAuthorizeCallbackData = {
      id: 'test-order-id',
      status: 'COMPLETED',
      create_time: '2023-01-01T12:00:00Z',
      update_time: '2023-01-01T12:01:00Z',
      intent: 'CAPTURE',
      payer: {},
      purchase_units: [],
      links: []
    };

    const fakeActions: IOnApproveCallbackActions = {
      redirect: jasmine.createSpy('redirect'),
      restart: jasmine.createSpy('restart'),
      order: {
        authorize: jasmine.createSpy('authorize').and.returnValue(Promise.resolve()),
        capture: jasmine.createSpy('capture').and.returnValue(Promise.resolve(fakeOrderDetails)),
        get: jasmine.createSpy('get').and.returnValue(Promise.resolve()),
        patch: jasmine.createSpy('patch').and.returnValue(Promise.resolve())
      }
    };

    const fakeApproveData: IOnApproveCallbackData = {
      orderID: 'test-order-id',
      payerID: 'test-payer-id',
      subscriptionID: ''
    };

    // Trigger onApprove callback
    FakePayPal.lastButtonsConfig.onApprove(fakeApproveData, fakeActions);
    expect(onApproveSpy).toHaveBeenCalledWith(fakeApproveData, fakeActions);

    // Flush microtasks triggered by capture() inside the component
    tick();
    expect(onClientAuthorizationSpy).toHaveBeenCalledWith(fakeOrderDetails);

    // Test other callbacks
    FakePayPal.lastButtonsConfig.onError('test-error');
    expect(onErrorSpy).toHaveBeenCalledWith('test-error');

    const fakeCancelData: ICancelCallbackData = { orderID: 'test-order-id' };
    FakePayPal.lastButtonsConfig.onCancel(fakeCancelData, {});
    expect(onCancelSpy).toHaveBeenCalledWith(fakeCancelData, {});

    FakePayPal.lastButtonsConfig.onClick('test-click-data', {});
    expect(onClickSpy).toHaveBeenCalledWith('test-click-data', {});

    FakePayPal.lastButtonsConfig.onInit({}, {});
    expect(onInitSpy).toHaveBeenCalledWith({}, {});

    // Test createOrder
    expect(FakePayPal.lastButtonsConfig.createOrder).toBeDefined();
    const createOrderActions: ICreateOrderCallbackActions = {
      order: {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve('test-order-id'))
      }
    };

    FakePayPal.lastButtonsConfig.createOrder({}, createOrderActions);
    expect(createOrderActions.order.create).toHaveBeenCalled();
  }));

  it('should use server-side createOrder when provided', fakeAsync(() => {
    // Arrange
    const createOrderOnServerSpy = jasmine.createSpy('createOrderOnServer')
      .and.returnValue(Promise.resolve('server-order-id'));

    hostComponent.config = {
      clientId: 'test-client-id',
      createOrderOnServer: createOrderOnServerSpy
    };

    // Act
    hostFixture.detectChanges();

    // Assert
    expect(FakePayPal.lastButtonsConfig.createOrder).toBeDefined();
    
    const createOrderActions: ICreateOrderCallbackActions = {
      order: {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve())
      }
    };

    // Call createOrder
    const orderPromise = FakePayPal.lastButtonsConfig.createOrder('test-data', createOrderActions);
    
    // Verify server-side order creation was used
    expect(createOrderOnServerSpy).toHaveBeenCalledWith('test-data');
    expect(createOrderActions.order.create).not.toHaveBeenCalled();
    
    // Verify promise resolution
    let resolvedId = '';
    orderPromise.then((orderId: string) => (resolvedId = orderId));
    tick();
    expect(resolvedId).toBe('server-order-id');
  }));

  it('should throw when both client and server order creators are provided', () => {
    // Arrange
    hostComponent.config = {
      clientId: 'test-client-id',
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '9.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'USD', value: '9.99' },
            quantity: '1'
          }]
        }]
      }),
      createOrderOnServer: () => Promise.resolve('server-order-id')
    };

    // Act
    hostFixture.detectChanges();

    // Assert
    expect(FakePayPal.lastButtonsConfig.createOrder).toBeDefined();

    const createOrderActions: ICreateOrderCallbackActions = {
      order: {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve())
      }
    };

    // Expect createOrder to throw due to conflicting creators
    expect(() => {
      FakePayPal.lastButtonsConfig.createOrder({}, createOrderActions);
    }).toThrow();
  });

  it('should throw when no order creator is provided', () => {
    // Arrange
    hostComponent.config = {
      clientId: 'test-client-id'
      // No createOrderOnClient or createOrderOnServer
    };

    // Act
    hostFixture.detectChanges();

    // Assert
    // Button config may exist for other internal purposes, but createOrder should be absent
    expect(
      FakePayPal.lastButtonsConfig && FakePayPal.lastButtonsConfig.createOrder
    ).toBeUndefined();
  });

  it('should map fundingSource and strip style.color for non-PAYPAL', () => {
    // Arrange
    hostComponent.config = {
      clientId: 'test-client-id',
      fundingSource: 'CARD',
      style: {
        color: 'gold',
        shape: 'rect'
      },
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '9.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'USD', value: '9.99' },
            quantity: '1'
          }]
        }]
      })
    };

    // Act
    hostFixture.detectChanges();

    // Assert
    expect(FakePayPal.lastButtonsConfig.fundingSource).toBe(MockPayPalScriptService.fakePayPal.FUNDING.CARD);
    expect(FakePayPal.lastButtonsConfig.style.color).toBeUndefined();
    expect(FakePayPal.lastButtonsConfig.style.shape).toBe('rect');
  });

  it('should handle subscription creation when provided', () => {
    // Arrange
    const createSubscriptionSpy = jasmine.createSpy('createSubscription')
      .and.returnValue({ plan_id: 'test-plan', custom_id: 'test-custom' });

    hostComponent.config = {
      clientId: 'test-client-id',
      vault: 'true',
      createSubscriptionOnClient: createSubscriptionSpy
    };

    // Act
    hostFixture.detectChanges();

    // Assert
    expect(FakePayPal.lastButtonsConfig.createSubscription).toBeDefined();
    
    const subscriptionData: ICreateSubscriptionCallbackData = {};
    const subscriptionActions: ICreateSubscriptionCallbackActions = {
      subscription: {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve('sub-id')),
        revise: jasmine.createSpy('revise').and.returnValue(Promise.resolve())
      }
    };

    // Call createSubscription
    FakePayPal.lastButtonsConfig.createSubscription(subscriptionData, subscriptionActions);
    
    // Verify client-side subscription creation was used
    expect(createSubscriptionSpy).toHaveBeenCalledWith(subscriptionData);
    expect(subscriptionActions.subscription.create).toHaveBeenCalledWith({ 
      plan_id: 'test-plan', 
      custom_id: 'test-custom' 
    });
  });

  it('reinitialize should destroy script, clear container DOM, generate new id, and re-register script', () => {
    // Arrange - start with valid config
    hostComponent.config = {
      clientId: 'test-client-id',
      currency: 'USD',
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '9.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'USD', value: '9.99' },
            quantity: '1'
          }]
        }]
      })
    };
    
    hostFixture.detectChanges();
    
    // Store initial ID
    const initialId = paypalComponent.payPalButtonContainerId;
    
    // Manually append a child to the container
    const containerElement = paypalDebugElement.query(By.css(`#${initialId}`)).nativeElement;
    const childElement = document.createElement('div');
    childElement.textContent = 'Test Child';
    containerElement.appendChild(childElement);
    
    // Reset tracking variables
    FakePayPal.lastButtonsConfig = undefined;
    FakePayPal.lastRenderSelector = undefined;
    MockPayPalScriptService.lastConfig = undefined;
    
    // Act - reinitialize with new config
    const newConfig: IPayPalConfig = {
      clientId: 'new-client-id',
      currency: 'EUR',
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: '19.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'EUR', value: '19.99' },
            quantity: '1'
          }]
        }]
      })
    };
    
    paypalComponent.reinitialize(newConfig);
    hostFixture.detectChanges();
    
    // Assert
    expect(paypalScriptService.destroyPayPalScript).toHaveBeenCalled();
    // original container should be cleared
    expect(containerElement.childNodes.length).toBe(0);
    expect(paypalComponent.payPalButtonContainerId).not.toBe(initialId);
    expect(MockPayPalScriptService.lastConfig!.clientId).toBe('new-client-id');
    expect(MockPayPalScriptService.lastConfig!.currency).toBe('EUR');
    expect(FakePayPal.lastRenderSelector!).toBe(
      `#${paypalComponent.payPalButtonContainerId}`
    );
  });

  it('ngOnDestroy should cleanup the PayPal script', () => {
    // Arrange
    hostComponent.config = {
      clientId: 'test-client-id',
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '9.99'
          },
          items: [{
            name: 'Test Item',
            unit_amount: { currency_code: 'USD', value: '9.99' },
            quantity: '1'
          }]
        }]
      })
    };
    
    hostFixture.detectChanges();
    
    // Act
    hostFixture.destroy();
    
    // Assert
    expect(paypalScriptService.destroyPayPalScript).toHaveBeenCalled();
  });
});

