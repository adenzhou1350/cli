import { describe, it, expect, afterEach } from 'bun:test';
import { default as taskGetCommand } from '../../../src/commands/video/task-get';
import { createMockServer, jsonResponse, type MockServer } from '../../helpers/mock-server';
import videoTaskSuccess from '../../fixtures/video-task-success.json';

describe('video task get command', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('has correct name', () => {
    expect(taskGetCommand.name).toBe('video task get');
  });

  it('requires task-id', async () => {
    const config = {
      apiKey: 'test-key',
      region: 'global' as const,
      baseUrl: 'https://api.mmx.io',
      output: 'text' as const,
      timeout: 10,
      verbose: false,
      quiet: false,
      noColor: true,
      yes: false,
      dryRun: false,
      nonInteractive: true,
      async: false,
    };

    await expect(
      taskGetCommand.execute(config, {
        quiet: false,
        verbose: false,
        noColor: true,
        yes: false,
        dryRun: false,
        help: false,
        nonInteractive: true,
        async: false,
      }),
    ).rejects.toThrow('--task-id is required');
  });

  it.each([false, true])('queries task status as JSON with quiet=%s', async (quiet) => {
    server = createMockServer({
      routes: {
        '/v1/query/video_generation': () => jsonResponse(videoTaskSuccess),
      },
    });

    const config = {
      apiKey: 'test-key',
      region: 'global' as const,
      baseUrl: server.url,
      output: 'json' as const,
      timeout: 10,
      verbose: false,
      quiet,
      noColor: true,
      yes: false,
      dryRun: false,
      nonInteractive: true,
      async: false,
    };

    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await taskGetCommand.execute(config, {
        taskId: '106916112212032',
        quiet,
        verbose: false,
        noColor: true,
        yes: false,
        dryRun: false,
        help: false,
        nonInteractive: true,
        async: false,
      });

      const parsed = JSON.parse(output);
      expect(parsed).toEqual({
        task_id: videoTaskSuccess.task_id,
        status: videoTaskSuccess.status,
        file_id: videoTaskSuccess.file_id,
        video_width: videoTaskSuccess.video_width,
        video_height: videoTaskSuccess.video_height,
      });
    } finally {
      console.log = originalLog;
    }
  });

  it.each([false, true])('queries MiniMax-H3 task status as JSON with quiet=%s', async (quiet) => {
    server = createMockServer({
      routes: {
        '/v2/query/video_generation/h3-123': () => jsonResponse({
          task: {
            id: 'h3-123',
            model: 'MiniMax-H3',
            status: 'succeeded',
            content: { url: 'https://example.com/video.mp4' },
            resolution: '2K',
            duration: 5,
            ratio: '16:9',
          },
        }),
      },
    });

    const config = {
      apiKey: 'test-key',
      region: 'global' as const,
      baseUrl: server.url,
      output: 'json' as const,
      timeout: 10,
      verbose: false,
      quiet,
      noColor: true,
      yes: false,
      dryRun: false,
      nonInteractive: true,
      async: false,
    };

    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await taskGetCommand.execute(config, {
        taskId: 'h3-123',
        model: 'MiniMax-H3',
        quiet,
        verbose: false,
        noColor: true,
        yes: false,
        dryRun: false,
        help: false,
        nonInteractive: true,
        async: false,
      });

      const parsed = JSON.parse(output);
      expect(parsed).toEqual({
        task_id: 'h3-123',
        model: 'MiniMax-H3',
        status: 'succeeded',
        url: 'https://example.com/video.mp4',
        resolution: '2K',
        duration: 5,
        ratio: '16:9',
      });
    } finally {
      console.log = originalLog;
    }
  });

  it.each([false, true])('keeps status-only quiet text output with H3=%s', async (usesV2) => {
    const status = usesV2 ? 'succeeded' : 'Success';
    server = createMockServer({
      routes: {
        '/v1/query/video_generation': () => jsonResponse(videoTaskSuccess),
        '/v2/query/video_generation/h3-123': () => jsonResponse({
          task: { id: 'h3-123', model: 'MiniMax-H3', status },
        }),
      },
    });
    const config = {
      apiKey: 'test-key',
      region: 'global' as const,
      baseUrl: server.url,
      output: 'text' as const,
      timeout: 10,
      verbose: false,
      quiet: true,
      noColor: true,
      yes: false,
      dryRun: false,
      nonInteractive: true,
      async: false,
    };
    const originalLog = console.log;
    const output: unknown[] = [];
    console.log = (msg: unknown) => { output.push(msg); };
    try {
      await taskGetCommand.execute(config, {
        ...config,
        help: false,
        taskId: usesV2 ? 'h3-123' : videoTaskSuccess.task_id,
        ...(usesV2 ? { model: 'MiniMax-H3' } : {}),
      });
      expect(output).toEqual([status]);
    } finally {
      console.log = originalLog;
    }
  });
});
