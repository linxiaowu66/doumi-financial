import { Modal, Form, InputNumber, Button, Flex } from "antd";
import { FormInstance } from "antd/es/form";

interface PlannedPurchaseModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: { plannedAmount: number }) => void;
  form: FormInstance;
  isMobile: boolean;
}

export default function PlannedPurchaseModal({
  open,
  onCancel,
  onFinish,
  form,
  isMobile,
}: PlannedPurchaseModalProps) {
  return (
    <Modal
      title="新建计划买入"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isMobile ? "90%" : 500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="计划买入金额"
          name="plannedAmount"
          rules={[{ required: true, message: "请输入计划买入金额" }]}
          tooltip="设置一个预期买入的金额，等时机合适时再执行"
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="输入金额"
            prefix="¥"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
