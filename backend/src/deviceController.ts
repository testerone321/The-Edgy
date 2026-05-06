import axios from 'axios';
import { StrokeCommand } from './types';
import { logger } from './logger';

export class DeviceController {
  private baseUrl = 'https://www.handyfeeling.com/api/handy/v2';

  async connect(connectionKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/connected`, {
        headers: { 'X-Connection-Key': connectionKey }
      });
      return response.data.connected === true;
    } catch (error) {
      logger.error('The Handy connection failed', error);
      return false;
    }
  }

  async stroke(connectionKey: string, command: StrokeCommand): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/mode`,
        { mode: 0 },
        { headers: { 'X-Connection-Key': connectionKey } }
      );

     await axios.put(
        `${this.baseUrl}/slide`,
        {
          min: command.minPosition,
          max: command.maxPosition
        },
        { headers: { 'X-Connection-Key': connectionKey } }
      );

      await axios.put(
        `${this.baseUrl}/hamp/start`,
        {},
        { headers: { 'X-Connection-Key': connectionKey } }
      );

      await axios.put(
        `${this.baseUrl}/hamp/velocity`,
        { velocity: command.speed },
        { headers: { 'X-Connection-Key': connectionKey } }
      );

      logger.debug(`Device stroke: min=${command.minPosition}, max=${command.maxPosition}, speed=${command.speed}`);
    } catch (error) {
      logger.error('Failed to send stroke command', error);
      if (axios.isAxiosError(error)) {
        logger.error('API Error', error.response?.data);
      }
    }
  }

  async stop(connectionKey: string): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/hamp/stop`,
        {},
        { headers: { 'X-Connection-Key': connectionKey } }
      );

      logger.debug('Device stopped');
    } catch (error) {
      logger.error('Failed to stop', error);
    }
  }

  async setSpeed(connectionKey: string, speed: number): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/hamp/velocity`,
        { velocity: speed },
        { headers: { 'X-Connection-Key': connectionKey } }
      );
      logger.debug(`Device speed updated: ${speed}%`);
    } catch (error) {
      logger.error('Failed to set speed', error);
    }
  }
}
