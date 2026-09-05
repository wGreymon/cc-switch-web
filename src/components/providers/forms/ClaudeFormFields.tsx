import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EndpointSpeedTest from "./EndpointSpeedTest";
import { ApiKeySection, EndpointField, ModelDropdown } from "./shared";
import {
  hasClaudeOneMMarker,
  setClaudeOneMMarker,
  stripClaudeOneMMarker,
  type ClaudeModelEnvField,
} from "./hooks/useModelState";
import type { ClaudeApiKeyField, ProviderCategory } from "@/types";
import type { TemplateValueConfig } from "@/config/claudeProviderPresets";
import type { FetchedModel } from "@/lib/api/model-fetch";

interface EndpointCandidate {
  url: string;
}

interface ClaudeFormFieldsProps {
  providerId?: string;
  // API Key
  shouldShowApiKey: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  category?: ProviderCategory;
  shouldShowApiKeyLink: boolean;
  websiteUrl: string;
  isPartner?: boolean;
  partnerPromotionKey?: string;

  // Template Values
  templateValueEntries: Array<[string, TemplateValueConfig]>;
  templateValues: Record<string, TemplateValueConfig>;
  templatePresetName: string;
  onTemplateValueChange: (key: string, value: string) => void;

  // Base URL
  /** 是否渲染请求地址输入框（官方类别不需要） */
  shouldShowEndpoint: boolean;
  /** 是否渲染"管理与测速"入口（依赖运行时能力，Web 模式下为 false） */
  shouldShowSpeedTest: boolean;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  isEndpointModalOpen: boolean;
  onEndpointModalToggle: (open: boolean) => void;
  onCustomEndpointsChange?: (endpoints: string[]) => void;
  isFullUrl: boolean;
  onFullUrlChange: (value: boolean) => void;

  // Auth Field (ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY)
  apiKeyField: ClaudeApiKeyField;
  onApiKeyFieldChange: (field: ClaudeApiKeyField) => void;

  // Model Mapping
  shouldShowModelSelector: boolean;
  claudeModel: string;
  defaultHaikuModel: string;
  defaultHaikuModelName: string;
  defaultSonnetModel: string;
  defaultSonnetModelName: string;
  defaultOpusModel: string;
  defaultOpusModelName: string;
  defaultFableModel: string;
  defaultFableModelName: string;
  subagentModel: string;
  onModelChange: (field: ClaudeModelEnvField, value: string) => void;
  fetchedModels?: FetchedModel[];
  isFetchingModels?: boolean;
  onFetchModels?: () => void;
  canFetchModels?: boolean;
  fetchModelsHint?: string;

  // Speed Test Endpoints
  speedTestEndpoints: EndpointCandidate[];
}

type ModelRoleRow = {
  role: "sonnet" | "opus" | "fable" | "haiku" | "subagent";
  label: string;
  model: string;
  displayName?: string;
  modelField: ClaudeModelEnvField;
  displayNameField?: ClaudeModelEnvField;
  inputId: string;
  supportsOneM: boolean;
};

export function ClaudeFormFields({
  providerId,
  shouldShowApiKey,
  apiKey,
  onApiKeyChange,
  category,
  shouldShowApiKeyLink,
  websiteUrl,
  isPartner,
  partnerPromotionKey,
  templateValueEntries,
  templateValues,
  templatePresetName,
  onTemplateValueChange,
  shouldShowEndpoint,
  shouldShowSpeedTest,
  baseUrl,
  onBaseUrlChange,
  isEndpointModalOpen,
  onEndpointModalToggle,
  onCustomEndpointsChange,
  isFullUrl,
  onFullUrlChange,
  apiKeyField,
  onApiKeyFieldChange,
  shouldShowModelSelector,
  claudeModel,
  defaultHaikuModel,
  defaultHaikuModelName,
  defaultSonnetModel,
  defaultSonnetModelName,
  defaultOpusModel,
  defaultOpusModelName,
  defaultFableModel,
  defaultFableModelName,
  subagentModel,
  onModelChange,
  fetchedModels = [],
  isFetchingModels = false,
  onFetchModels,
  canFetchModels = true,
  fetchModelsHint,
  speedTestEndpoints,
}: ClaudeFormFieldsProps) {
  const { t } = useTranslation();

  const hasAnyAdvancedValue = !!(
    claudeModel ||
    defaultHaikuModel ||
    defaultSonnetModel ||
    defaultOpusModel ||
    defaultFableModel ||
    subagentModel ||
    apiKeyField !== "ANTHROPIC_AUTH_TOKEN"
  );
  const [advancedExpanded, setAdvancedExpanded] = useState(hasAnyAdvancedValue);

  // 预设填充高级值后自动展开（仅从折叠→展开，不会自动折叠）
  useEffect(() => {
    if (hasAnyAdvancedValue) {
      setAdvancedExpanded(true);
    }
  }, [hasAnyAdvancedValue]);

  const fallbackUsesOneM = hasClaudeOneMMarker(claudeModel);

  const requestModelLabel = t("providerForm.requestModelLabel", {
    defaultValue: "实际请求模型",
  });
  const displayNameLabel = t("providerForm.modelDisplayNameLabel", {
    defaultValue: "显示名称",
  });
  const oneMLabel = t("providerForm.modelOneMLabel", { defaultValue: "1M" });
  const fallbackModelLabel = t("providerForm.fallbackModelLabel", {
    defaultValue: "默认兜底模型",
  });

  // 模型输入框：手动输入 + 拉取成功后的搜索式下拉
  const renderModelInput = (
    id: string,
    value: string,
    onValueChange: (value: string) => void,
    ariaLabel?: string,
  ) => (
    <div className="flex gap-1">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={t("providerForm.modelPlaceholder", { defaultValue: "" })}
        autoComplete="off"
        aria-label={ariaLabel}
        className="flex-1"
      />
      {fetchedModels.length > 0 ? (
        <ModelDropdown models={fetchedModels} onSelect={onValueChange} />
      ) : isFetchingModels ? (
        <Button variant="outline" size="icon" className="shrink-0" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : null}
    </div>
  );

  const modelRoleRows: ModelRoleRow[] = [
    {
      role: "sonnet",
      label: t("providerForm.modelRoleSonnet", { defaultValue: "Sonnet" }),
      model: defaultSonnetModel,
      displayName: defaultSonnetModelName,
      modelField: "ANTHROPIC_DEFAULT_SONNET_MODEL",
      displayNameField: "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
      inputId: "claudeDefaultSonnetModel",
      supportsOneM: true,
    },
    {
      role: "opus",
      label: t("providerForm.modelRoleOpus", { defaultValue: "Opus" }),
      model: defaultOpusModel,
      displayName: defaultOpusModelName,
      modelField: "ANTHROPIC_DEFAULT_OPUS_MODEL",
      displayNameField: "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME",
      inputId: "claudeDefaultOpusModel",
      supportsOneM: true,
    },
    {
      role: "fable",
      label: t("providerForm.modelRoleFable", { defaultValue: "Fable" }),
      model: defaultFableModel,
      displayName: defaultFableModelName,
      modelField: "ANTHROPIC_DEFAULT_FABLE_MODEL",
      displayNameField: "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME",
      inputId: "claudeDefaultFableModel",
      supportsOneM: true,
    },
    {
      role: "haiku",
      label: t("providerForm.modelRoleHaiku", { defaultValue: "Haiku" }),
      model: defaultHaikuModel,
      displayName: defaultHaikuModelName,
      modelField: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      displayNameField: "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME",
      inputId: "claudeDefaultHaikuModel",
      supportsOneM: false,
    },
    {
      role: "subagent",
      label: t("providerForm.modelRoleSubagent", { defaultValue: "Subagent" }),
      model: subagentModel,
      modelField: "CLAUDE_CODE_SUBAGENT_MODEL",
      inputId: "claudeCodeSubagentModel",
      supportsOneM: true,
    },
  ];

  // 改模型名时，只在显示名为空或仍等于旧模型名（即未被用户自定义过）时跟着同步
  const handleRoleModelChange = (row: ModelRoleRow, value: string) => {
    const oldModelBase = stripClaudeOneMMarker(row.model).trim();
    const normalizedValue = row.supportsOneM
      ? value
      : stripClaudeOneMMarker(value);
    const nextModelBase = stripClaudeOneMMarker(normalizedValue).trim();
    const displayName = row.displayName?.trim() ?? "";
    const shouldSyncDisplayName = !displayName || displayName === oldModelBase;
    onModelChange(row.modelField, normalizedValue);
    if (row.displayNameField && shouldSyncDisplayName) {
      onModelChange(row.displayNameField, nextModelBase);
    }
  };

  const handleRoleOneMChange = (row: ModelRoleRow, enabled: boolean) => {
    if (!row.supportsOneM) return;
    handleRoleModelChange(row, setClaudeOneMMarker(row.model, enabled));
  };

  const quickSetSourceModel =
    claudeModel ||
    defaultSonnetModel ||
    defaultOpusModel ||
    defaultFableModel ||
    defaultHaikuModel ||
    subagentModel;

  const handleQuickSetModels = () => {
    if (!quickSetSourceModel) return;
    for (const row of modelRoleRows) {
      const roleValue = row.supportsOneM
        ? quickSetSourceModel
        : stripClaudeOneMMarker(quickSetSourceModel);
      onModelChange(row.modelField, roleValue);
      if (row.displayNameField) {
        onModelChange(row.displayNameField, stripClaudeOneMMarker(roleValue));
      }
    }
    toast.success(
      t("providerForm.quickSetSuccess", {
        defaultValue: "已将模型名称应用到所有角色",
      }),
    );
  };

  return (
    <>
      {/* API Key 输入框 */}
      {shouldShowApiKey && (
        <ApiKeySection
          value={apiKey}
          onChange={onApiKeyChange}
          category={category}
          shouldShowLink={shouldShowApiKeyLink}
          websiteUrl={websiteUrl}
          isPartner={isPartner}
          partnerPromotionKey={partnerPromotionKey}
        />
      )}

      {/* 模板变量输入 */}
      {templateValueEntries.length > 0 && (
        <div className="space-y-3">
          <FormLabel>
            {t("providerForm.parameterConfig", {
              name: templatePresetName,
              defaultValue: `${templatePresetName} 参数配置`,
            })}
          </FormLabel>
          <div className="space-y-4">
            {templateValueEntries.map(([key, config]) => (
              <div key={key} className="space-y-2">
                <FormLabel htmlFor={`template-${key}`}>
                  {config.label}
                </FormLabel>
                <Input
                  id={`template-${key}`}
                  type="text"
                  required
                  value={
                    templateValues[key]?.editorValue ??
                    config.editorValue ??
                    config.defaultValue ??
                    ""
                  }
                  onChange={(e) => onTemplateValueChange(key, e.target.value)}
                  placeholder={config.placeholder || config.label}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 请求地址输入框（"管理与测速"按钮依赖运行时能力，输入框本身不依赖） */}
      {shouldShowEndpoint && (
        <EndpointField
          id="baseUrl"
          label={t("providerForm.apiEndpoint")}
          value={baseUrl}
          onChange={onBaseUrlChange}
          placeholder={t("providerForm.apiEndpointPlaceholder")}
          hint={t("providerForm.apiHint")}
          showManageButton={shouldShowSpeedTest}
          onManageClick={
            shouldShowSpeedTest ? () => onEndpointModalToggle(true) : undefined
          }
          showFullUrlToggle
          isFullUrl={isFullUrl}
          onFullUrlChange={onFullUrlChange}
        />
      )}

      {/* 端点测速弹窗 */}
      {shouldShowSpeedTest && isEndpointModalOpen && (
        <EndpointSpeedTest
          appId="claude"
          providerId={providerId}
          value={baseUrl}
          onChange={onBaseUrlChange}
          initialEndpoints={speedTestEndpoints}
          visible={isEndpointModalOpen}
          onClose={() => onEndpointModalToggle(false)}
          onCustomEndpointsChange={onCustomEndpointsChange}
        />
      )}

      {/* 高级选项：认证字段 + 模型映射 */}
      {shouldShowModelSelector && (
        <Collapsible
          open={advancedExpanded}
          onOpenChange={setAdvancedExpanded}
          className="rounded-lg border border-border-default p-4"
        >
          <CollapsibleTrigger className="flex h-8 w-full items-center justify-start gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70">
            {advancedExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {t("providerForm.advancedOptionsToggle", {
              defaultValue: "高级选项",
            })}
          </CollapsibleTrigger>
          {!advancedExpanded && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">
              {t("providerForm.advancedOptionsHint", {
                defaultValue:
                  "包含认证字段、模型映射等配置。大多数场景下保持默认即可。",
              })}
            </p>
          )}
          <CollapsibleContent className="space-y-4 pt-2">
            {/* 认证字段选择器 */}
            <div className="space-y-2">
              <FormLabel htmlFor="claudeApiKeyField">
                {t("providerForm.authField", { defaultValue: "认证字段" })}
              </FormLabel>
              <Select
                value={apiKeyField}
                onValueChange={(v) =>
                  onApiKeyFieldChange(v as ClaudeApiKeyField)
                }
              >
                <SelectTrigger id="claudeApiKeyField">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANTHROPIC_AUTH_TOKEN">
                    {t("providerForm.authFieldAuthToken", {
                      defaultValue: "ANTHROPIC_AUTH_TOKEN（默认）",
                    })}
                  </SelectItem>
                  <SelectItem value="ANTHROPIC_API_KEY">
                    {t("providerForm.authFieldApiKey", {
                      defaultValue: "ANTHROPIC_API_KEY",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("providerForm.authFieldHint", {
                  defaultValue: "选择写入配置的认证环境变量名",
                })}
              </p>
            </div>

            {/* 模型映射 */}
            <div className="space-y-1 border-t border-border-default pt-4">
              <div className="flex items-center justify-between gap-3">
                <FormLabel>
                  {t("providerForm.modelMappingLabel", {
                    defaultValue: "模型映射",
                  })}
                </FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleQuickSetModels}
                    disabled={!quickSetSourceModel}
                    className="h-7 gap-1"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {t("providerForm.quickSetModels", {
                      defaultValue: "一键设置",
                    })}
                  </Button>
                  {onFetchModels ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onFetchModels}
                      disabled={isFetchingModels || !canFetchModels}
                      className="h-7 gap-1"
                      title={fetchModelsHint}
                    >
                      {isFetchingModels ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {t("providerForm.fetchModels")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("providerForm.modelMappingHint", {
                  defaultValue:
                    "显示名称只影响 /model 菜单；1M 只是给 Claude Code 的上下文能力声明。",
                })}
              </p>
            </div>

            <div className="space-y-3">
              <div className="hidden grid-cols-[120px_1fr_minmax(0,1fr)_104px] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
                <span>
                  {t("providerForm.modelRoleLabel", {
                    defaultValue: "模型角色",
                  })}
                </span>
                <span>{displayNameLabel}</span>
                <span>{requestModelLabel}</span>
                <span>
                  {t("providerForm.modelOneMHeader", {
                    defaultValue: "声明支持 1M",
                  })}
                </span>
              </div>

              {modelRoleRows.map((row) => {
                const modelBase = stripClaudeOneMMarker(row.model);
                const usesOneM =
                  row.supportsOneM && hasClaudeOneMMarker(row.model);

                return (
                  <div
                    key={row.role}
                    className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_minmax(0,1fr)_104px]"
                  >
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                      {row.label}
                    </div>
                    {row.displayNameField ? (
                      <Input
                        value={row.displayName ?? ""}
                        onChange={(event) =>
                          onModelChange(
                            row.displayNameField!,
                            event.target.value,
                          )
                        }
                        aria-label={`${row.label} ${displayNameLabel}`}
                        placeholder={
                          modelBase ||
                          t("providerForm.modelDisplayNamePlaceholder", {
                            defaultValue: "例如 DeepSeek V4 Pro",
                          })
                        }
                        autoComplete="off"
                      />
                    ) : (
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        {t("providerForm.modelNoDisplayName", {
                          defaultValue: "不显示在 /model 菜单",
                        })}
                      </div>
                    )}
                    {renderModelInput(
                      row.inputId,
                      modelBase,
                      (value) =>
                        handleRoleModelChange(
                          row,
                          row.supportsOneM
                            ? setClaudeOneMMarker(value, usesOneM)
                            : stripClaudeOneMMarker(value),
                        ),
                      `${row.label} ${requestModelLabel}`,
                    )}
                    {row.supportsOneM && (
                      <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={usesOneM}
                          onCheckedChange={(checked) =>
                            handleRoleOneMChange(row, checked === true)
                          }
                          aria-label={`${row.label} ${oneMLabel}`}
                        />
                        {oneMLabel}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 默认兜底模型 */}
            <div className="space-y-2 border-t border-border-default pt-4">
              <FormLabel htmlFor="claudeModel">{fallbackModelLabel}</FormLabel>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_minmax(0,104px)]">
                {renderModelInput(
                  "claudeModel",
                  stripClaudeOneMMarker(claudeModel),
                  (value) =>
                    onModelChange(
                      "ANTHROPIC_MODEL",
                      setClaudeOneMMarker(value, fallbackUsesOneM),
                    ),
                )}
                <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={fallbackUsesOneM}
                    onCheckedChange={(checked) => {
                      const base = stripClaudeOneMMarker(claudeModel).trim();
                      if (!base) return;
                      onModelChange(
                        "ANTHROPIC_MODEL",
                        setClaudeOneMMarker(base, checked === true),
                      );
                    }}
                    aria-label={`${fallbackModelLabel} ${oneMLabel}`}
                  />
                  {oneMLabel}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("providerForm.fallbackModelHint", {
                  defaultValue:
                    "用于未明确落到 Sonnet、Opus、Fable、Haiku 角色的请求。使用第三方/中转端点时建议填写：否则这些请求（含 Haiku 后台子任务）会以原始 Claude 模型名透传给上游，可能因上游无此模型而报错。官方端点可留空。",
                })}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
