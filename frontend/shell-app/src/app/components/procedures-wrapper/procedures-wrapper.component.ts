import { Component, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';

/**
 * Angular wrapper that mounts the React Procedures micro-frontend.
 *
 * Uses loadRemoteModule (instead of a bare dynamic import) so that webpack's
 * shared-scope is initialised before the React MF module is evaluated — this
 * prevents the "empty module" problem caused by the React singleton resolution
 * failing silently when loaded from an Angular shell.
 */
@Component({
  selector: 'app-procedures-wrapper',
  standalone: true,
  template: `<div #mountPoint class="procedures-mount"></div>`,
  styles: [`.procedures-mount { width: 100%; height: 100%; min-height: 400px; }`]
})
export class ProceduresWrapperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mountPoint', { static: true }) mountPoint!: ElementRef<HTMLDivElement>;

  private reactRoot: any = null;

  constructor(private route: ActivatedRoute) {}

  async ngAfterViewInit(): Promise<void> {
    const patientId = this.route.snapshot.paramMap.get('patientId') ?? undefined;

    try {
      const mf: any = await loadRemoteModule({
        type: 'script',
        remoteEntry: 'http://localhost:4207/remoteEntry.js',
        remoteName: 'proceduresApp',
        exposedModule: './ProceduresModule'
      });

      // The MF export shape is: export default { renderProceduresModule, ... }
      const exports = mf?.default ?? mf;
      const render: Function | undefined =
        exports?.renderProceduresModule ?? mf?.renderProceduresModule;

      if (typeof render === 'function') {
        this.reactRoot = render(this.mountPoint.nativeElement, patientId);
      } else {
        console.error('[ProceduresWrapper] renderProceduresModule not found. Exports:', exports);
      }
    } catch (err) {
      console.error('[ProceduresWrapper] Failed to load procedures MF:', err);
    }
  }

  ngOnDestroy(): void {
    if (this.reactRoot && typeof this.reactRoot.unmount === 'function') {
      this.reactRoot.unmount();
    }
  }
}
