import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
type SettingsFormProps = {
  phone: string;
};

export default function SettingsForm({ phone }: SettingsFormProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Номер телефону</h2>
      <div className="space-y-2">
        <Label htmlFor="phone">Номер, з яким ви увійшли в систему</Label>
        <PhoneInput id="phone" value={phone} disabled readOnly />
      </div>
    </section>
  );
}
