import {
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Button,
  Flex,
  Row,
  Col,
} from "antd";
import { FormInstance } from "antd/es/form";

interface ExecutePlanModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  form: FormInstance;
  isMobile: boolean;
}

export default function ExecutePlanModal({
  open,
  onCancel,
  onFinish,
  form,
  isMobile,
}: ExecutePlanModalProps) {
  return (
    <Modal
      title="执行计划买入"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isMobile ? "90%" : 600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="计划金额"
          name="plannedAmount"
          tooltip="这是之前设置的计划金额"
        >
          <InputNumber
            style={{ width: "100%" }}
            disabled
            prefix="¥"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="买入日期"
          name="date"
          rules={[{ required: true, message: "请选择买入日期" }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="选择日期"
            size="large"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="买入净值"
              name="price"
              rules={[{ required: true, message: "请输入买入净值" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={4}
                placeholder="输入净值"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="手续费"
              name="fee"
              tooltip="手续费将从买入金额中扣除"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={2}
                placeholder="输入手续费"
                prefix="¥"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              确认买入
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
