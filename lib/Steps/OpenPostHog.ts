import { URL } from 'node:url';
import type { Answers } from 'inquirer';

import { mapIntegrationToPlatform } from '../Constants';
import { BottomBar } from '../Helper/BottomBar';
import { dim, green, l, nl, red } from '../Helper/Logging';
import { getCurrentIntegration } from '../Helper/Wizard';
import { BaseStep } from './BaseStep';

import opn from 'opn';

export class OpenPostHog extends BaseStep {
  public async emit(answers: Answers): Promise<Answers> {
    if (!(await getCurrentIntegration(answers).shouldEmit(answers))) {
      dim('Skipping connection to PostHog due files already patched');
      return {};
    }
    if (this._argv.skipConnect) {
      dim('Skipping connection to PostHog');
      return {};
    }

    const baseUrl = this._argv.url;

    BottomBar.show('Loading wizard...');
    this.debug(`Loading wizard for ${baseUrl}`);

    try {
      const response = await fetch(`${baseUrl}api/wizard/`);
      if (!response.ok) {
        throw new Error(
          `Failed to connect to PostHog: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as { hash: string };

      BottomBar.hide();

      const urlObj = new URL(`${baseUrl}account/settings/wizard/${data.hash}/`);
      if (this._argv.signup) {
        urlObj.searchParams.set('signup', '1');
        // integration maps to platform in the wizard
        if (this._argv.integration) {
          const platform = mapIntegrationToPlatform(this._argv.integration);
          if (platform) {
            urlObj.searchParams.set('project_platform', platform);
          }
        }
      }

      const urlToOpen = urlObj.toString();

      opn(urlToOpen, { wait: false }).catch(() => {
        // opn throws in environments that don't have a browser (e.g. remote shells) so we just noop here
      });

      nl();
      l('Please open');
      green(urlToOpen);
      l("in your browser (if it's not open already)");
      nl();

      return { hash: data.hash };
    } catch (e) {
      this._argv.skipConnect = true;
      BottomBar.hide();
      nl();
      red(
        `Wizard couldn't connect to ${baseUrl}\nmake sure the url is correct`,
      );
      l(
        'But no worries, we fall back to asking you stuff instead, so here we go:',
      );
      return {};
    }
  }
}
