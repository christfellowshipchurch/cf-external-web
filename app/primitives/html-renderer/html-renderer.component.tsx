import parse, {
  attributesToProps,
  domToReact,
  DOMNode,
} from 'html-react-parser';
import { Link } from 'react-router';
import './html-renderer.styles.css';
import { cn } from '~/lib/utils';
import { sanitizeCmsHtml } from '~/lib/sanitize';

export const HTMLRenderer = ({
  html,
  className,
  linkClassName,
  stripFormattingTags = false,
}: {
  /** CMS / API fields may be missing; treat as empty. */
  html?: string | null;
  className?: string;
  linkClassName?: string;
  stripFormattingTags?: boolean;
}) => {
  const safeHtml = html ?? '';

  // Check if the content is just plain text (no HTML tags)
  const isPlainText = (content: string): boolean => {
    // Trim whitespace and check if it contains any HTML tags
    const trimmed = content.trim();
    // If it doesn't contain < or >, it's likely plain text
    // Also check that it's not empty
    return (
      trimmed.length > 0 && !trimmed.includes('<') && !trimmed.includes('>')
    );
  };

  const options = {
    replace(domNode: DOMNode) {
      // Remove <b>, <strong>, <i>, <em> tags by unwrapping their children if enabled
      if (
        stripFormattingTags &&
        domNode.type === 'tag' &&
        domNode.name &&
        ['b', 'strong', 'i', 'em'].includes(domNode.name)
      ) {
        return (
          <>{domToReact((domNode.children as DOMNode[]) || [], options)}</>
        );
      }

      // Custom handling for <a> tags - convert to React Router Link
      if (domNode.type === 'tag' && domNode.name === 'a' && domNode.attribs) {
        const htmlProps = attributesToProps(domNode.attribs);
        const { href, className, target } = htmlProps;

        // Only convert internal links to React Router Link. `target="_blank"`
        // is excluded: a client-side Link can't open a new tab, so authored
        // targets were silently dropped (CFDP-4231).
        if (
          href &&
          typeof href === 'string' &&
          !href.startsWith('http') &&
          target !== '_blank'
        ) {
          return (
            <Link
              to={href}
              className={cn(
                className?.toString(),
                linkClassName ?? '!text-ocean',
              )}
              prefetch='intent'
            >
              {domToReact((domNode.children as DOMNode[]) || [], options)}
            </Link>
          );
        }

        // External links — and any link opening a new tab — stay plain <a> tags
        return (
          <a
            href={href?.toString()}
            className={cn(
              className,
              linkClassName ?? 'text-ocean hover:text-navy',
            )}
            target={target?.toString()}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          >
            {domToReact((domNode.children as DOMNode[]) || [], options)}
          </a>
        );
      }

      // Custom handling for <img>
      if (domNode.type === 'tag' && domNode.name === 'img' && domNode.attribs) {
        const htmlProps = attributesToProps(domNode.attribs);
        const { src } = htmlProps;

        return (
          <div className='article-image relative my-4 h-[400px] w-full'>
            <img
              src={
                !src?.toString().includes('https')
                  ? `https://rock.christfellowship.church/${src?.toString()}`
                  : src?.toString()
              }
              alt={'Article Image'}
              className='size-full'
            />
          </div>
        );
      }
    },
  };

  const parsedContent = parse(sanitizeCmsHtml(safeHtml), options);
  const isText = isPlainText(safeHtml);

  // Use <p> tag for plain text, <div> for HTML content
  if (isText) {
    return <p className={cn('html-renderer', className)}>{parsedContent}</p>;
  }

  return <div className={cn('html-renderer', className)}>{parsedContent}</div>;
};
