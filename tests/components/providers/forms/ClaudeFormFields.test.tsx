import { render, screen } from "@testing-library/react";
import type { LabelHTMLAttributes } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeFormFields } from "@/components/providers/forms/ClaudeFormFields";

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      String(options?.defaultValue ?? key),
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/components/ui/form", () => ({
  FormLabel: ({
    children,
    ...props
  }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

const defaultProps = {
  shouldShowApiKey: false,
  apiKey: "",
  onApiKeyChange: vi.fn(),
  shouldShowApiKeyLink: false,
  websiteUrl: "",
  templateValueEntries: [],
  templateValues: {},
  templatePresetName: "",
  onTemplateValueChange: vi.fn(),
  shouldShowEndpoint: true,
  shouldShowSpeedTest: false,
  baseUrl: "https://api.example.com",
  onBaseUrlChange: vi.fn(),
  isEndpointModalOpen: false,
  onEndpointModalToggle: vi.fn(),
  isFullUrl: false,
  onFullUrlChange: vi.fn(),
  apiKeyField: "ANTHROPIC_AUTH_TOKEN" as const,
  onApiKeyFieldChange: vi.fn(),
  shouldShowModelSelector: true,
  claudeModel: "",
  defaultHaikuModel: "",
  defaultHaikuModelName: "",
  defaultSonnetModel: "",
  defaultSonnetModelName: "",
  defaultOpusModel: "",
  defaultOpusModelName: "",
  defaultFableModel: "",
  defaultFableModelName: "",
  subagentModel: "",
  onModelChange: vi.fn(),
  speedTestEndpoints: [],
};

describe("ClaudeFormFields", () => {
  beforeEach(() => {
    toastMock.success.mockReset();
  });

  it("renders the endpoint input in Web mode where endpoint speed test is unavailable", () => {
    // 回归用例：URL 输入框曾与"管理和测速"共用同一个能力开关，
    // 导致 Web 模式（endpoint_test: false）下完全看不到请求地址
    render(<ClaudeFormFields {...defaultProps} shouldShowSpeedTest={false} />);

    expect(screen.getByLabelText("providerForm.apiEndpoint")).toHaveValue(
      "https://api.example.com",
    );
    expect(
      screen.queryByRole("button", { name: "管理和测速" }),
    ).not.toBeInTheDocument();
  });

  it("hides the endpoint input for official providers", () => {
    render(<ClaudeFormFields {...defaultProps} shouldShowEndpoint={false} />);

    expect(
      screen.queryByLabelText("providerForm.apiEndpoint"),
    ).not.toBeInTheDocument();
  });

  it("renders the speed test entry when the runtime supports it", () => {
    render(<ClaudeFormFields {...defaultProps} shouldShowSpeedTest />);

    expect(
      screen.getByRole("button", { name: "管理和测速" }),
    ).toBeInTheDocument();
  });

  it("toggles the full URL switch and swaps the endpoint hint", async () => {
    const user = userEvent.setup();
    const onFullUrlChange = vi.fn();
    const { rerender } = render(
      <ClaudeFormFields {...defaultProps} onFullUrlChange={onFullUrlChange} />,
    );

    await user.click(screen.getByRole("switch", { name: "完整 URL" }));
    expect(onFullUrlChange).toHaveBeenCalledWith(true);

    rerender(
      <ClaudeFormFields
        {...defaultProps}
        isFullUrl
        onFullUrlChange={onFullUrlChange}
      />,
    );
    expect(
      screen.getByText(/路由将直接使用此 URL，不拼接路径/),
    ).toBeInTheDocument();
  });

  it("keeps the advanced section collapsed until it holds a value", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClaudeFormFields {...defaultProps} />);

    const trigger = screen.getByRole("button", { name: "高级选项" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Sonnet 实际请求模型")).not.toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Sonnet 实际请求模型")).toBeVisible();

    // 预设/编辑带出高级值时自动展开，避免用户看不到已生效的配置
    rerender(<ClaudeFormFields {...defaultProps} />);
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <ClaudeFormFields {...defaultProps} defaultSonnetModel="deepseek-v4" />,
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Sonnet 实际请求模型")).toHaveValue(
      "deepseek-v4",
    );
  });

  it("syncs the display name while it still mirrors the model id", async () => {
    const user = userEvent.setup();
    const onModelChange = vi.fn();
    render(
      <ClaudeFormFields
        {...defaultProps}
        defaultSonnetModel="old"
        defaultSonnetModelName="old"
        onModelChange={onModelChange}
      />,
    );

    await user.type(screen.getByLabelText("Sonnet 实际请求模型"), "x");

    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "oldx",
    );
    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
      "oldx",
    );
  });

  it("keeps a customized display name when the model id changes", async () => {
    const user = userEvent.setup();
    const onModelChange = vi.fn();
    render(
      <ClaudeFormFields
        {...defaultProps}
        defaultSonnetModel="old"
        defaultSonnetModelName="My Fast Model"
        onModelChange={onModelChange}
      />,
    );

    await user.type(screen.getByLabelText("Sonnet 实际请求模型"), "x");

    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "oldx",
    );
    expect(onModelChange).not.toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
      expect.anything(),
    );
  });

  it("appends and strips the 1M marker through the checkbox", async () => {
    const user = userEvent.setup();
    const onModelChange = vi.fn();
    const { rerender } = render(
      <ClaudeFormFields
        {...defaultProps}
        defaultOpusModel="glm-5"
        onModelChange={onModelChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Opus 1M" }));
    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "glm-5[1M]",
    );

    onModelChange.mockClear();
    rerender(
      <ClaudeFormFields
        {...defaultProps}
        defaultOpusModel="glm-5[1M]"
        onModelChange={onModelChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Opus 1M" });
    expect(checkbox).toBeChecked();
    // 输入框只展示裸模型名，标记不应泄漏到 UI
    expect(screen.getByLabelText("Opus 实际请求模型")).toHaveValue("glm-5");

    await user.click(checkbox);
    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "glm-5",
    );
  });

  it("offers no 1M declaration for Haiku", () => {
    render(
      <ClaudeFormFields {...defaultProps} defaultHaikuModel="glm-5-air" />,
    );

    expect(
      screen.queryByRole("checkbox", { name: "Haiku 1M" }),
    ).not.toBeInTheDocument();
  });

  it("applies one model to every role via quick set", async () => {
    const user = userEvent.setup();
    const onModelChange = vi.fn();
    render(
      <ClaudeFormFields
        {...defaultProps}
        claudeModel="glm-5[1M]"
        onModelChange={onModelChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /一键设置/ }));

    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "glm-5[1M]",
    );
    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
      "glm-5",
    );
    // Haiku 不支持 1M，套用时要把标记剥掉
    expect(onModelChange).toHaveBeenCalledWith(
      "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      "glm-5",
    );
    expect(onModelChange).toHaveBeenCalledWith(
      "CLAUDE_CODE_SUBAGENT_MODEL",
      "glm-5[1M]",
    );
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("disables quick set until a model is filled in", () => {
    render(
      <ClaudeFormFields {...defaultProps} apiKeyField="ANTHROPIC_API_KEY" />,
    );

    expect(screen.getByRole("button", { name: /一键设置/ })).toBeDisabled();
  });

  it("only renders the model dropdown after models are fetched", () => {
    const { rerender } = render(
      <ClaudeFormFields {...defaultProps} defaultSonnetModel="glm-5" />,
    );
    expect(
      screen.queryByRole("button", { name: "Select model" }),
    ).not.toBeInTheDocument();

    rerender(
      <ClaudeFormFields
        {...defaultProps}
        defaultSonnetModel="glm-5"
        fetchedModels={[{ id: "glm-5", ownedBy: "zhipu" }]}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: "Select model" }).length,
    ).toBeGreaterThan(0);
  });
});
