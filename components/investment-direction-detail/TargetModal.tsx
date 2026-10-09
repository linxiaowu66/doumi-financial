import {
  Modal,
  Form,
  InputNumber,
  Typography,
  Button,
  Flex,
} from "antd";
import { FormInstance } from "antd/es/form";
import { InvestmentDirection } from "@/types/investment-direction-detail";

const { Text } = Typography;

interface TargetModalProps {
  open: boolean;
  editingCategory: string;
  direction: InvestmentDirection | null;
  onCancel: () => void;
  onFinish: (values: { targetPercent: number }) => void;
  form: FormInstance;
}

export default function TargetModal({
  open,
  editingCategory,
  direction,
  onCancel,
  onFinish,
  form,
}: TargetModalProps) {
  return (
    <Modal
      title={`设置"${editingCategory}"分类目标仓位`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="目标仓位百分比 (%)"
          name="targetPercent"
          rules={[
            { required: true, message: "请输入目标仓位百分比" },
            {
              type: "number",
              min: 0,
              max: 100,
              message: "百分比必须在 0-100 之间",
            },
          ]}
          tooltip="目标金额 = 投资方向预期投入 × 目标仓位。达到目标金额后，系统会提示不要继续加仓。"
        >
          <InputNumber<number>
            placeholder="请输入百分比（0-100）"
            size="large"
            style={{ width: "100%" }}
            min={0}
            max={100}
            precision={2}
            formatter={(value) => (value ? `${value}%` : "")}
            parser={(value) => {
              const num = parseFloat(value!.replace("%", ""));
              if (isNaN(num)) return 0;
              return Math.max(0, Math.min(100, num));
            }}
            addonAfter="%"
          />
        </Form.Item>
        {direction?.expectedAmount &&
          form.getFieldValue("targetPercent") > 0 && (
            <Form.Item label="计算后的目标金额">
              <Text type="secondary">
                预期投入：¥{Number(direction.expectedAmount).toLocaleString()} × {form.getFieldValue("targetPercent")}%，目标金额：¥{(Number(direction.expectedAmount) * Number(form.getFieldValue("targetPercent") || 0) / 100).toLocaleString()}
              </Text>
            </Form.Item>
          )}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
