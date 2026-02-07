import { Modal, Form, Input, InputNumber, Button, Flex } from 'antd';
import { FormInstance } from 'antd/es/form';
import { InvestmentDirection } from '@/types/investment-direction';

interface DirectionModalProps {
  open: boolean;
  editingDirection: InvestmentDirection | null;
  onCancel: () => void;
  onFinish: (values: { name: string; expectedAmount: number }) => void;
  form: FormInstance;
}

export default function DirectionModal({
  open,
  editingDirection,
  onCancel,
  onFinish,
  form,
}: DirectionModalProps) {
  return (
    <Modal
      title={editingDirection ? '编辑投资方向' : '新建投资方向'}
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
          label="投资方向名称"
          name="name"
          rules={[{ required: true, message: '请输入投资方向名称' }]}
        >
          <Input
            placeholder="如：海外长钱、稳钱账户、长钱账户"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="预期投入金额 (元)"
          name="expectedAmount"
          rules={[{ required: true, message: '请输入预期投入金额' }]}
        >
          <InputNumber
            placeholder="请输入金额"
            size="large"
            style={{ width: '100%' }}
            min={0}
            precision={2}
            formatter={(value) =>
              `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingDirection ? '更新' : '创建'}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
