import mercariInstance from '../mercari/mercari';
import { saveLog } from '../utils/saveLog';
import { getHeadersWithDpop } from '../mercari/utils';
import { MercariURLs, MercariSearchSort, MercariSearchStatus } from '../mercari/types';

jest.mock('../utils/saveLog');
jest.mock('./utils');

global.fetch = jest.fn();

describe('MercariApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getHeadersWithDpop as jest.Mock).mockResolvedValue({ header: 'value' });
  });

  describe('refreshTokens', () => {
    it('should generate a new uuid and key', async () => {
      const instance = mercariInstance;
      const oldUuid = instance.uuid;
      await instance.refreshTokens();
      expect(instance.uuid).not.toBe(oldUuid);
      expect(instance.key).toBeDefined();
    });
  });

//   describe('getItemDetails', () => {
//     it('should throw if id is empty', async () => {
//       await expect(mercariInstance.getItemDetails('')).rejects.toThrow('Item id cannot be empty!');
//     });
//     it('should call fetchMercari and saveLog', async () => {
//       const mockData = { id: '123', name: 'item' };
//       jest.spyOn(mercariInstance, 'fetchMercari').mockResolvedValueOnce(mockData);
//       await mercariInstance.getItemDetails('123');
//       expect(mercariInstance.fetchMercari).toHaveBeenCalled();
//       expect(saveLog).toHaveBeenCalledWith('logs/item_info.json', mockData);
//     });
//   });

  describe('getItemTranslation', () => {
    it('should throw if id is empty', async () => {
      await expect(mercariInstance.getItemTranslation('')).rejects.toThrow('Item id cannot be empty!');
    });
    it('should call fetchMercari and saveLog', async () => {
      const mockData = { translation: 'foo' };
      jest.spyOn(mercariInstance, 'fetchMercari').mockResolvedValueOnce(mockData);
      await mercariInstance.getItemTranslation('abc');
      expect(mercariInstance.fetchMercari).toHaveBeenCalled();
      expect(saveLog).toHaveBeenCalledWith('logs/item_translation.json', mockData);
    });
  });

  describe('fetchMercari', () => {
    it('should throw if no response is received', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(null);
      await expect(mercariInstance.fetchMercari('GET', 'url', {})).rejects.toThrow('No response received from fetchMercari');
    });
    it('should throw if response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'bad' })
      });
      await expect(mercariInstance.fetchMercari('GET', 'url', {})).rejects.toThrow('Error while fetching: 400 Bad Request');
    });
    it('should return data if response is ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foo: 'bar' })
      });
      const data = await mercariInstance.fetchMercari('GET', 'url', {});
      expect(data).toEqual({ foo: 'bar' });
    });
  });

  describe('search', () => {
    it('should call fetchMercari and saveLog', async () => {
      const mockData = { items: [] };
      jest.spyOn(mercariInstance, 'fetchMercari').mockResolvedValueOnce(mockData);
      const result = await mercariInstance.search({ keyword: 'test' });
      expect(mercariInstance.fetchMercari).toHaveBeenCalled();
      expect(saveLog).toHaveBeenCalledWith('logs/search_results.json', mockData);
      expect(result).toEqual(mockData);
    });
  });
});
