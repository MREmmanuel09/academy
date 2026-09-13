'use client';

import {
  exportUserDataAction,
  saveAiConfigAction,
  updateProfileAction,
} from '@/app/actions/settings';
import { AI_FEATURES_ENABLED } from '@/lib/ai';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export interface SettingsFormProps {
  user: {
    email: string;
    name: string;
    preferredLocale: 'es' | 'en';
    timezone: string;
  };
  aiConfig: {
    hasOpenaiKey: boolean;
    hasAnthropicKey: boolean;
    hasOllamaUrl: boolean;
    ollamaBaseUrl: string;
    enabled: boolean;
  };
}

export function SettingsForm({ user, aiConfig }: SettingsFormProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [pendingProfile, startProfile] = useTransition();
  const [pendingAi, startAi] = useTransition();
  const [pendingExport, startExport] = useTransition();

  const handleExport = () => {
    startExport(async () => {
      const r = await exportUserDataAction();
      if (!r.ok) {
        setExportMsg(r.error);
        return;
      }
      const blob = new Blob([r.body], { type: r.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(t('exportOk'));
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
          <CardDescription>{t('profileDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              setProfileMsg(null);
              startProfile(async () => {
                const r = await updateProfileAction(fd);
                setProfileMsg(r.ok ? t('saved') : r.error);
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={user.email} disabled />
            </div>
            <div>
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" name="name" defaultValue={user.name} required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="preferredLocale">{t('language')}</Label>
              <select
                id="preferredLocale"
                name="preferredLocale"
                defaultValue={user.preferredLocale}
                className="rounded border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <Label htmlFor="timezone">{t('timezone')}</Label>
              <Input id="timezone" name="timezone" defaultValue={user.timezone} maxLength={100} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pendingProfile}>
                {pendingProfile ? tCommon('saving') : tCommon('save')}
              </Button>
              {profileMsg ? <p className="text-sm text-muted-foreground">{profileMsg}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {AI_FEATURES_ENABLED ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('aiTitle')}</CardTitle>
            <CardDescription>{t('aiDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => {
                setAiMsg(null);
                startAi(async () => {
                  const r = await saveAiConfigAction(fd);
                  setAiMsg(r.ok ? t('saved') : r.error);
                });
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="openaiKey">OpenAI API key</Label>
                <Input
                  id="openaiKey"
                  name="openaiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={aiConfig.hasOpenaiKey ? '•••• (configured)' : 'sk-...'}
                />
              </div>
              <div>
                <Label htmlFor="anthropicKey">Anthropic API key</Label>
                <Input
                  id="anthropicKey"
                  name="anthropicKey"
                  type="password"
                  autoComplete="off"
                  placeholder={aiConfig.hasAnthropicKey ? '•••• (configured)' : 'sk-ant-...'}
                />
              </div>
              <div>
                <Label htmlFor="ollamaBaseUrl">Ollama base URL</Label>
                <Input
                  id="ollamaBaseUrl"
                  name="ollamaBaseUrl"
                  type="url"
                  defaultValue={aiConfig.ollamaBaseUrl}
                  placeholder="http://localhost:11434"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={aiConfig.enabled}
                  className="accent-primary"
                />
                {t('aiEnable')}
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pendingAi}>
                  {pendingAi ? tCommon('saving') : tCommon('save')}
                </Button>
                {aiMsg ? <p className="text-sm text-muted-foreground">{aiMsg}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('exportTitle')}</CardTitle>
          <CardDescription>{t('exportDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={pendingExport} variant="outline">
            {pendingExport ? '…' : t('exportButton')}
          </Button>
          {exportMsg ? (
            <p className="ml-3 inline text-sm text-muted-foreground">{exportMsg}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
