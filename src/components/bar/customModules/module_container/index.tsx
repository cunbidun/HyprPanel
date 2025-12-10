import { CustomBarModule } from '../types';
import { Module } from '../../shared/module';
import { Astal } from 'astal/gtk3';
import { bind, Variable } from 'astal';
import { getIcon } from './helpers/icon';
import { getLabel } from './helpers/label';
import { initActionListener, initCommandPoller, initSignalWatcher, setupModuleInteractions } from './setup';
import { BarBoxChild } from 'src/components/bar/types';

export const ModuleContainer = (moduleName: string, moduleMetadata: CustomBarModule): BarBoxChild => {
    const {
        icon: moduleIcon = '',
        label: moduleLabel = '',
        tooltip: moduleTooltip = '',
        truncationSize: moduleTruncation = -1,
        execute: moduleExecute = '',
        executeOnAction: moduleExecuteOnAction = '',
        interval: moduleInterval = -1,
        signalPath = '',
        hideOnEmpty: moduleHideOnEmpty = false,
        scrollThreshold: moduleScrollThreshold = 4,
        actions: moduleActions = {},
    } = moduleMetadata;

    const pollingInterval: Variable<number> = Variable(moduleInterval);
    const actionExecutionListener: Variable<boolean> = Variable(true);
    const commandOutput: Variable<string> = Variable('');

    const commandPoller = initCommandPoller(commandOutput, pollingInterval, moduleExecute, moduleInterval);
    initActionListener(actionExecutionListener, moduleExecuteOnAction, commandOutput);
    const signalMonitor = initSignalWatcher(signalPath, () => commandPoller.execute());
    // always fetch once so modules without polling still render initial value
    commandPoller.execute();

    const module = Module({
        textIcon: bind(commandOutput).as((cmdOutput) => getIcon(moduleName, cmdOutput, moduleIcon)),
        tooltipText: bind(commandOutput).as((cmdOutput) => getLabel(moduleName, cmdOutput, moduleTooltip)),
        boxClass: `cmodule cmodule-${moduleName.replace(/custom\//, '')}`,
        label: bind(commandOutput).as((cmdOutput) => getLabel(moduleName, cmdOutput, moduleLabel)),
        truncationSize: bind(Variable(typeof moduleTruncation === 'number' ? moduleTruncation : -1)),
        props: {
            setup: (self: Astal.Button) =>
                setupModuleInteractions(self, moduleActions, actionExecutionListener, moduleScrollThreshold),
            onDestroy: () => {
                commandPoller.stop();
                signalMonitor?.cancel();
            },
        },
        isVis: bind(commandOutput).as((cmdOutput) => (moduleHideOnEmpty ? cmdOutput.length > 0 : true)),
    });

    return module;
};
