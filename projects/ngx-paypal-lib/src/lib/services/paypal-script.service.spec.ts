import { TestBed } from '@angular/core/testing';

import { PayPalScriptService } from './paypal-script.service';
import { ScriptService } from './script.service';
import { IPayPalUrlConfig, IQueryParam } from '../models/paypal-models';

describe('PayPalScriptService', () => {
  let service: PayPalScriptService;
  let mockScriptService: jasmine.SpyObj<ScriptService>;

  beforeEach(() => {
    // Create mock for ScriptService
    mockScriptService = jasmine.createSpyObj('ScriptService', ['registerScript', 'cleanup']);

    TestBed.configureTestingModule({
      providers: [
        PayPalScriptService,
        { provide: ScriptService, useValue: mockScriptService }
      ]
    });

    service = TestBed.inject(PayPalScriptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate correct URL with minimal config (clientId only)', () => {
    // Arrange
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id'
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id');
    
    // Check global variable name
    const globalVar = mockScriptService.registerScript.calls.mostRecent().args[1];
    expect(globalVar).toBe('paypal');
    
    // Check callback is passed through
    const callback = mockScriptService.registerScript.calls.mostRecent().args[2];
    expect(callback).toBe(onReadySpy);
  });

  it('should generate correct URL with locale and currency', () => {
    // Arrange
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      locale: 'en_US',
      currency: 'USD'
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id&locale=en_US&currency=USD');
  });

  it('should generate correct URL with commit and vault flags', () => {
    // Arrange
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      commit: 'true',
      vault: 'true'
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id&commit=true&vault=true');
  });

  it('should generate correct URL with intent parameter', () => {
    // Arrange
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      intent: 'CAPTURE'
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id&intent=CAPTURE');
  });

  it('should add components parameter when funding is true', () => {
    // Arrange
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      funding: true
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id&components=buttons,funding-eligibility');
  });

  it('should append extra query parameters', () => {
    // Arrange
    const extraParams: IQueryParam[] = [
      { name: 'disable-funding', value: 'credit,card' },
      { name: 'enable-funding', value: 'venmo' }
    ];
    
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      extraParams
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe('https://www.paypal.com/sdk/js?client-id=test-client-id&disable-funding=credit,card&enable-funding=venmo');
  });

  it('should generate correct URL with all parameters in the expected order', () => {
    // Arrange
    const extraParams: IQueryParam[] = [
      { name: 'debug', value: 'true' },
      { name: 'buyer-country', value: 'US' }
    ];
    
    const config: IPayPalUrlConfig = {
      clientId: 'test-client-id',
      locale: 'en_US',
      currency: 'USD',
      commit: 'true',
      vault: 'true',
      intent: 'CAPTURE',
      funding: true,
      extraParams
    };
    const onReadySpy = jasmine.createSpy('onReady');

    // Act
    service.registerPayPalScript(config, onReadySpy);

    // Assert
    expect(mockScriptService.registerScript).toHaveBeenCalledTimes(1);
    
    // Check URL
    const url = mockScriptService.registerScript.calls.mostRecent().args[0];
    expect(url).toBe(
      'https://www.paypal.com/sdk/js?client-id=test-client-id&locale=en_US&currency=USD&commit=true&vault=true&intent=CAPTURE&components=buttons,funding-eligibility&debug=true&buyer-country=US'
    );
  });

  it('should call ScriptService.cleanup with "paypal" when destroying script', () => {
    // Act
    service.destroyPayPalScript();

    // Assert
    expect(mockScriptService.cleanup).toHaveBeenCalledWith('paypal');
  });
});
