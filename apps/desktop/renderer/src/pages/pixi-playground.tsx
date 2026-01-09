import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';

export default function PixiPlaygroundPage() {
  return (
    <div
      className={
        'relative h-full flex flex-col items-center justify-center gap-4'
      }
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)',
        }}
      />

      <h1 className="relative z-10">PIXI</h1>
      <ButtonGroup className="relative z-10">
        <Button variant={'outline'}>A</Button>
        <Button variant={'outline'}>B</Button>
        <Button variant={'outline'}>C</Button>
      </ButtonGroup>

      <div
        className={'relative z-10 border border-neutral-50 w-1/2 h-1/2'}
      ></div>
    </div>
  );
}
