import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    Context,
    FocusService,
    GridCtrl,
    IGridComp,
    AgStackComponentsRegistry
} from 'ag-grid-community';
import { classesList } from './utils';
import useReactCommentEffect from './reactComment';
import TabGuardComp, { TabGuardCompCallback } from './tabGuardComp';
import GridBodyComp  from './gridBodyComp';

const GridComp = (props: { context: Context }) => {

    const [rtlClass, setRtlClass] = useState<string>('');
    const [keyboardFocusClass, setKeyboardFocusClass] = useState<string>('');
    const [layoutClass, setLayoutClass] = useState<string>('');
    const [cursor, setCursor] = useState<string | null>(null);
    const [userSelect, setUserSelect] = useState<string | null>(null);
    const [initialised, setInitialised] = useState<boolean>(false);
    const [tabGuardReady, setTabGuardReady] = useState<any>();

    const gridCtrlRef = useRef<GridCtrl | null>(null);
    const eRootWrapperRef = useRef<HTMLDivElement>(null);
    const tabGuardRef = useRef<any>();
    const eGridBodyParentRef = useRef<HTMLDivElement>(null);
    const focusInnerElementRef = useRef<((fromBottom?: boolean) => void)>(() => undefined);

    const onTabKeyDown = useCallback(() => undefined, []);

    useReactCommentEffect(' AG Grid ', eRootWrapperRef);

    // create shared controller.
    useEffect(() => {
        const currentController = gridCtrlRef.current = props.context.createBean(new GridCtrl());

        return () => {
            props.context.destroyBean(currentController);
            gridCtrlRef.current = null;
        }
    }, []);

    // initialise the UI
    useEffect(() => {
        const gridCtrl = gridCtrlRef.current!;

        focusInnerElementRef.current = gridCtrl.focusInnerElement.bind(gridCtrl);

        const compProxy: IGridComp = {
            destroyGridUi:
                () => {}, // do nothing, as framework users destroy grid by removing the comp
            setRtlClass: setRtlClass,
            addOrRemoveKeyboardFocusClass:
                (addOrRemove: boolean) => setKeyboardFocusClass(addOrRemove ? FocusService.AG_KEYBOARD_FOCUS : ''),
            forceFocusOutOfContainer: () => {
                tabGuardRef.current!.forceFocusOutOfContainer();
            },
            updateLayoutClasses: setLayoutClass,
            getFocusableContainers: () => {
                const els: HTMLElement[] = [];

                const gridBodyCompEl = eRootWrapperRef.current!.querySelector('.ag-root');
                const sideBarEl = eRootWrapperRef.current!.querySelector('.ag-side-bar')

                if (gridBodyCompEl) {
                    els.push(gridBodyCompEl as HTMLElement);
                }

                if (sideBarEl) {
                    els.push(sideBarEl as HTMLElement);
                }

                return els;
            },
            setCursor,
            setUserSelect
        };

        gridCtrl.setComp(compProxy, eRootWrapperRef.current!, eRootWrapperRef.current!);

        setInitialised(true);
    }, []);

    // initialise the extra components
    useEffect(() => {
        if (!tabGuardReady) { return; }

        const gridCtrl = gridCtrlRef.current!;
        const beansToDestroy: any[] = [];

        const context = props.context;
        const agStackComponentsRegistry: AgStackComponentsRegistry = context.getBean('agStackComponentsRegistry');
        const HeaderDropZonesClass = agStackComponentsRegistry.getComponentClass('AG-GRID-HEADER-DROP-ZONES');
        const SideBarClass = agStackComponentsRegistry.getComponentClass('AG-SIDE-BAR');
        const StatusBarClass = agStackComponentsRegistry.getComponentClass('AG-STATUS-BAR');
        const WatermarkClass = agStackComponentsRegistry.getComponentClass('AG-WATERMARK');
        const PaginationClass = agStackComponentsRegistry.getComponentClass('AG-PAGINATION');
        const additionalEls: HTMLDivElement[] = [];
        const eRootWrapper = eRootWrapperRef.current!;
        const eGridBodyParent = eGridBodyParentRef.current!;

        if (gridCtrl.showDropZones() && HeaderDropZonesClass) {
            const headerDropZonesComp = context.createBean(new HeaderDropZonesClass());
            const eGui = headerDropZonesComp.getGui();
            eRootWrapper.insertAdjacentElement('afterbegin', eGui);
            additionalEls.push(eGui);
            beansToDestroy.push(headerDropZonesComp);
        }

        if (gridCtrl.showSideBar() && SideBarClass) {
            const sideBarComp = context.createBean(new SideBarClass());
            const eGui = sideBarComp.getGui();
            const bottomTabGuard = eGridBodyParent.querySelector('.ag-tab-guard-bottom');
            if (bottomTabGuard) {
                bottomTabGuard.insertAdjacentElement('beforebegin', eGui);
                additionalEls.push(eGui);
            }

            beansToDestroy.push(sideBarComp);
        }

        if (gridCtrl.showStatusBar() && StatusBarClass) {
            const statusBarComp = context.createBean(new StatusBarClass());
            const eGui = statusBarComp.getGui();
            eRootWrapper.insertAdjacentElement('beforeend', eGui);
            additionalEls.push(eGui);
            beansToDestroy.push(statusBarComp);
        }

        if (PaginationClass) {
            const paginationComp = context.createBean(new PaginationClass());
            const eGui = paginationComp.getGui();
            eRootWrapper.insertAdjacentElement('beforeend', eGui);
            additionalEls.push(eGui);
            beansToDestroy.push(paginationComp);
        }

        if (gridCtrl.showWatermark() && WatermarkClass) {
            const watermarkComp = context.createBean(new WatermarkClass());
            const eGui = watermarkComp.getGui();
            eRootWrapper.insertAdjacentElement('beforeend', eGui);
            additionalEls.push(eGui);
            beansToDestroy.push(watermarkComp);
        }

        return () => {
            context.destroyBeans(beansToDestroy);
            additionalEls.forEach(el => {
                if (el.parentElement) {
                    el.parentElement.removeChild(el);
                }
            });
        }
    }, [tabGuardReady])

    const rootWrapperClasses = classesList('ag-root-wrapper', rtlClass, keyboardFocusClass, layoutClass);
    const rootWrapperBodyClasses = classesList('ag-root-wrapper-body', 'ag-focus-managed', layoutClass);

    const topStyle = useMemo(() => ({
        "user-select": userSelect != null ? userSelect : '',
        '-webkit-user-select': userSelect != null ? userSelect : '',
        cursor: cursor != null ? cursor : ''
    }), [userSelect, cursor]);

    const eGridBodyParent = eGridBodyParentRef.current;

    const setTabGuardCompRef = useCallback( ref => {
        tabGuardRef.current = ref;
        setTabGuardReady(true);
    }, []);

    return (
        <div ref={ eRootWrapperRef } className={ rootWrapperClasses } style={ topStyle }>
            <div className={ rootWrapperBodyClasses } ref={ eGridBodyParentRef }>
                { initialised && eGridBodyParent &&
                    <TabGuardComp
                        ref={ setTabGuardCompRef }
                        context={ props.context }
                        eFocusableElement= { eGridBodyParent }
                        onTabKeyDown={ onTabKeyDown }
                        gridCtrl={ gridCtrlRef.current! }>
                    { // we wait for initialised before rending the children, so GridComp has created and registered with it's
                    // GridCtrl before we create the child GridBodyComp. Otherwise the GridBodyComp would initialise first,
                    // before we have set the the Layout CSS classes, causing the GridBodyComp to render rows to a grid that
                    // doesn't have it's height specified, which would result if all the rows getting rendered (and if many rows,
                    // hangs the UI)
                         <GridBodyComp context={ props.context }/>
                    }
                    </TabGuardComp>
                }
            </div>
        </div>
    );
};

export default GridComp;
