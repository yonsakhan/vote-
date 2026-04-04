'use client';

type AnimatedTitleProps = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  centered?: boolean;
  variant?: 'hero' | 'page';
};

export default function AnimatedTitle({
  eyebrow,
  title,
  highlight,
  description,
  centered = false,
  variant = 'hero',
}: AnimatedTitleProps) {
  const titleClassName =
    variant === 'page'
      ? 'hero-title type-page font-semibold tracking-tight text-balance'
      : 'hero-title type-display font-semibold tracking-tight text-balance';

  const descriptionClassName =
    variant === 'page'
      ? 'max-w-2xl type-body text-secondary'
      : 'max-w-2xl type-body text-secondary';

  return (
    <div className={centered ? 'space-y-5 text-center' : 'space-y-5'}>
      {eyebrow ? (
        <div className={centered ? 'flex justify-center' : 'flex'}>
          <span className="neo-badge">{eyebrow}</span>
        </div>
      ) : null}
      <div className="space-y-4">
        <h1 className={titleClassName}>
          <span>{title}</span>
          {highlight ? (
            <>
              <br />
              <span className="hero-title-accent">{highlight}</span>
            </>
          ) : null}
        </h1>
        {description ? (
          <p
            className={`${descriptionClassName} ${
              centered ? 'mx-auto' : ''
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
