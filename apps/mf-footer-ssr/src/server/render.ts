import 'zone.js/node';
import '@angular/compiler';
import { type BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { FooterAppComponent, FOOTER_ROUTE } from '../app/footer-app';

const extractBodyHtml = (documentHtml: string): string => {
  const bodyMatch = documentHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch?.[1] ?? documentHtml;
};

export const renderFooterHtml = async (route: string): Promise<string> => {
  const documentHtml = await renderApplication(
    (context: BootstrapContext) =>
      bootstrapApplication(FooterAppComponent, {
        providers: [{ provide: FOOTER_ROUTE, useValue: route }]
      }, context),
    {
      document: '<cosmos-footer></cosmos-footer>',
      url: route
    }
  );

  return extractBodyHtml(documentHtml);
};
