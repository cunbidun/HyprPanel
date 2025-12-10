import { Variable, bind, execAsync } from 'astal';
import { Astal } from 'astal/gtk3';
import { Gio } from 'astal/file';
import { BashPoller } from 'src/lib/poller/BashPoller';
import { CustomBarModule } from '../types';
import { InputHandlerService } from '../../utils/input/inputHandler';

const inputHandler = InputHandlerService.getInstance();

export function initCommandPoller(
    commandOutput: Variable<string>,
    pollingInterval: Variable<number>,
    moduleExecute: string,
    moduleInterval: number,
): BashPoller<string, []> {
    const commandPoller = new BashPoller<string, []>(
        commandOutput,
        [],
        bind(pollingInterval),
        moduleExecute || '',
        (commandResult: string) => commandResult,
    );

    if (moduleInterval >= 0) {
        commandPoller.initialize();
    }

    return commandPoller;
}

export function initActionListener(
    actionExecutionListener: Variable<boolean>,
    moduleExecuteOnAction: string,
    commandOutput: Variable<string>,
): void {
    actionExecutionListener.subscribe(() => {
        if (typeof moduleExecuteOnAction !== 'string' || !moduleExecuteOnAction.length) {
            return;
        }

        execAsync(moduleExecuteOnAction).then((cmdOutput) => {
            commandOutput.set(cmdOutput);
        });
    });
}

export function initSignalWatcher(signalPath: string, onSignal: () => void): Gio.FileMonitor | undefined {
    if (!signalPath?.length) {
        return;
    }

    const file = Gio.File.new_for_path(signalPath);
    const parent = file.get_parent();

    try {
        if (parent !== null && !parent.query_exists(null)) {
            parent.make_directory_with_parents(null);
        }
        if (!file.query_exists(null)) {
            file.create(Gio.FileCreateFlags.NONE, null);
        }

        const monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
        monitor.connect('changed', (_mon, _file, _other, eventType) => {
            switch (eventType) {
                case Gio.FileMonitorEvent.CHANGES_DONE_HINT:
                case Gio.FileMonitorEvent.CHANGED:
                case Gio.FileMonitorEvent.CREATED:
                case Gio.FileMonitorEvent.ATTRIBUTE_CHANGED:
                    onSignal();
                    break;
                default:
                    break;
            }
        });
        return monitor;
    } catch (error) {
        console.error(`Failed to watch signal file ${signalPath}: ${error}`);
        return;
    }
}

/**
 * Sets up user interaction handlers for the module
 */
export function setupModuleInteractions(
    element: Astal.Button,
    moduleActions: CustomBarModule['actions'],
    actionListener: Variable<boolean>,
    moduleScrollThreshold: number,
): void {
    const scrollThreshold = moduleScrollThreshold >= 0 ? moduleScrollThreshold : 1;
    inputHandler.attachHandlers(
        element,
        {
            onPrimaryClick: {
                cmd: Variable(moduleActions?.onLeftClick ?? ''),
            },
            onSecondaryClick: {
                cmd: Variable(moduleActions?.onRightClick ?? ''),
            },
            onMiddleClick: {
                cmd: Variable(moduleActions?.onMiddleClick ?? ''),
            },
            onScrollUp: {
                cmd: Variable(moduleActions?.onScrollUp ?? ''),
            },
            onScrollDown: {
                cmd: Variable(moduleActions?.onScrollDown ?? ''),
            },
        },
        actionListener,
        scrollThreshold,
    );
}
