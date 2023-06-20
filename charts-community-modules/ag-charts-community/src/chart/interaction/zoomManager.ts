import { ChartAxis } from '../chartAxis';
import { ChartAxisDirection } from '../chartAxisDirection';
import { BaseManager } from './baseManager';

interface ZoomState {
    min: number;
    max: number;
}

export interface AxisZoomState {
    x?: ZoomState;
    y?: ZoomState;
}

export interface ZoomChangeEvent extends AxisZoomState {
    type: 'zoom-change';
}

/**
 * Manages the current zoom state for a chart. Tracks the requested zoom from distinct dependents
 * and handles conflicting zoom requests.
 */
export class ZoomManager extends BaseManager<'zoom-change', ZoomChangeEvent> {
    private axes: Record<string, AxisZoomManager> = {};

    public updateAxes(axes: Array<ChartAxis>) {
        axes.forEach((axis) => {
            this.axes[axis.id] = this.axes[axis.id] ?? new AxisZoomManager(axis.direction);
        });
    }

    public updateZoom(callerId: string, newZoom?: AxisZoomState) {
        Object.values(this.axes).forEach((axis) => {
            axis.updateZoom(callerId, newZoom?.[axis.direction]);
        });

        this.applyStates();
    }

    public updateAxisZoom(callerId: string, axisId: string, newZoom?: ZoomState) {
        this.axes[axisId]?.updateZoom(callerId, newZoom);

        this.applyStates();

        // TODO: fire event?
    }

    public getZoom(): AxisZoomState | undefined {
        let x: ZoomState | undefined;
        let y: ZoomState | undefined;

        // TODO: this only works when there is a single axis on each direction as it gets the last of each
        Object.values(this.axes).forEach((axis) => {
            if (axis.direction === ChartAxisDirection.X) {
                x = axis.getZoom();
            } else if (axis.direction === ChartAxisDirection.Y) {
                y = axis.getZoom();
            }
        });

        if (x || y) {
            return { x, y };
        }
    }

    public getAxisZoom(axisId: string): ZoomState | undefined {
        return this.axes[axisId]?.getZoom();
    }

    private applyStates() {
        const changed = Object.values(this.axes)
            .map((axis) => axis.applyStates())
            .some(Boolean);
        if (!changed) {
            return;
        }
        const currentZoom = this.getZoom();
        const event: ZoomChangeEvent = {
            type: 'zoom-change',
            ...(currentZoom ?? {}),
        };
        this.listeners.dispatch('zoom-change', event);
    }
}

class AxisZoomManager {
    private readonly states: Record<string, ZoomState> = {};
    private currentZoom?: ZoomState = undefined;

    public direction: ChartAxisDirection;

    constructor(direction: ChartAxisDirection) {
        this.direction = direction;
    }

    public updateZoom(callerId: string, newZoom?: ZoomState) {
        delete this.states[callerId];

        if (newZoom != null) {
            this.states[callerId] = { ...newZoom };
        }
    }

    public getZoom(): ZoomState | undefined {
        return this.currentZoom;
    }

    public applyStates(): boolean {
        const prevZoom = this.currentZoom;
        const last = Object.keys(this.states)[Object.keys(this.states).length - 1];

        this.currentZoom = { ...this.states[last] };

        const changed = prevZoom?.min !== this.currentZoom?.min || prevZoom?.max !== this.currentZoom?.max;

        return changed;
    }
}
