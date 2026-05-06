import { Component, InjectionToken, inject } from '@angular/core';

export const FOOTER_ROUTE = new InjectionToken<string>('FOOTER_ROUTE');

@Component({
  selector: 'cosmos-footer',
  standalone: true,
  template: `
    <section>
      <small>Footer Micro-Frontend (Angular SSR) · {{ route }} · © Cosmos Platform</small>
    </section>
  `
})
export class FooterAppComponent {
  protected readonly route = inject(FOOTER_ROUTE);
}
