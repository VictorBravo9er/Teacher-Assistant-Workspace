import React, { useState, useEffect } from 'react';
import { Material, ContentItem } from '@/types/main';
import { materialService } from '@/services/materialService';
import {
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  BookOpen,
  Link2,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalBody } from '@/components/ui';

interface MaterialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
  classId?: string;
  onTriggerToast?: (msg: string) => void;
}

export default function MaterialPreviewModal({
  isOpen,
  onClose,
  material,
  classId,
  onTriggerToast,
}: MaterialPreviewModalProps) {
  if (!isOpen) return null;

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const firstItem: ContentItem | undefined = material.content && material.content[0];
  const isUrl = firstItem?.type === 'URL' || material.category === 'Link';
  const rawPath = firstItem?.path || firstItem?.value || '';

  const isPdf =
    rawPath.toLowerCase().endsWith('.pdf') ||
    (firstItem?.name || material.name).toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(
    rawPath || firstItem?.name || material.name
  );

  useEffect(() => {
    let active = true;

    async function loadUrl() {
      if (isUrl) {
        setSignedUrl(rawPath);
        return;
      }

      setLoadingUrl(true);

      try {
        const url = await materialService.getMaterialDownloadUrl(
          material.id,
          classId,
          firstItem?.path,
          firstItem?.id
        );
        if (active) setSignedUrl(url);
      } catch (err: any) {
        console.warn('Could not generate signed URL:', err);
        if (active) {
          if (rawPath.startsWith('http') || rawPath.startsWith('blob:')) {
            setSignedUrl(rawPath);
          }
        }
      } finally {
        if (active) setLoadingUrl(false);
      }
    }

    loadUrl();
    return () => {
      active = false;
    };
  }, [material, classId, isUrl, rawPath, firstItem]);

  const handleCopyLink = () => {
    const targetUrl = signedUrl || rawPath;
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      if (onTriggerToast) onTriggerToast('Material link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const targetUrl = signedUrl || rawPath;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      id="material-preview-modal"
      size={isFullscreen ? 'full' : 'xl'}
    >
      <ModalHeader
        title={material.name}
        subtitle={
          <div className="flex items-center gap-2 text-[10px] text-muted-text font-mono mt-0.5">
            <span>
              Size:{' '}
              {material.size ||
                (firstItem?.size_bytes
                  ? `${(firstItem.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                  : '0 MB')}
            </span>
            <span>•</span>
            <span>
              Uploaded:{' '}
              {material.uploadDate
                ? new Date(material.uploadDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently'}
            </span>
            {material.dueAt && (
              <>
                <span>•</span>
                <span className="text-warning font-semibold">
                  Due:{' '}
                  {new Date(material.dueAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        }
        badge={
          <div className="flex items-center gap-1.5">
            <Badge variant="primary">{material.category}</Badge>
            {material.toBeScored && (
              <Badge variant="success">Max {material.maxScore || 100} pts</Badge>
            )}
          </div>
        }
        icon={isUrl ? <Link2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        onClose={onClose}
      >
        <button
          onClick={handleCopyLink}
          className="p-2 hover:bg-elevated text-muted-text hover:text-primary rounded-xl transition-colors cursor-pointer"
          title="Copy Link"
        >
          {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </button>

        {(signedUrl || rawPath) && (
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-elevated text-muted-text hover:text-primary rounded-xl transition-colors cursor-pointer"
            title="Download / Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 hover:bg-elevated text-muted-text hover:text-primary rounded-xl transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </ModalHeader>

      {/* Viewer Area */}
      <ModalBody className="p-4 bg-background/50 flex items-center justify-center overflow-hidden">
        {loadingUrl ? (
          <div className="flex flex-col items-center gap-3 text-primary animate-pulse">
            <BookOpen className="w-8 h-8 animate-bounce" />
            <span className="text-xs font-mono font-semibold">
              Generating Secure Signed Preview Stream...
            </span>
          </div>
        ) : isUrl ? (
          <div className="max-w-md w-full bg-surface border border-border-color rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Link2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-primary-text font-display">
                {material.name}
              </h4>
              <p className="text-xs text-muted-text font-mono mt-1 break-all">
                {rawPath || 'https://example.com'}
              </p>
            </div>
            <a
              href={rawPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Launch Web Resource
            </a>
          </div>
        ) : isImage && signedUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={signedUrl}
              alt={material.name}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
            />
          </div>
        ) : isPdf && signedUrl ? (
          <div className="w-full h-full rounded-2xl overflow-hidden border border-border-color shadow-inner bg-surface">
            <object
              data={`${signedUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full space-y-3 p-6 text-center">
                <FileText className="w-10 h-10 text-primary" />
                <p className="text-xs text-primary-text font-medium">
                  PDF Document Loaded. If embedded preview does not render in your browser:
                </p>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Open PDF in Viewer Tab
                </a>
              </div>
            </object>
          </div>
        ) : (
          <div className="max-w-2xl w-full bg-surface border border-border-color rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-border-color">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <h4 className="text-sm font-bold text-primary-text font-display">
                  {material.name}
                </h4>
                <span className="text-[10px] text-muted-text font-mono">
                  Class Document & Reference Material
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-secondary-text leading-relaxed bg-elevated/50 p-4 rounded-2xl border border-border-color font-mono">
              <p>
                <strong>Category:</strong> {material.category}
              </p>
              <p>
                <strong>Storage Path:</strong> {rawPath || 'Uploaded directly to class cohort'}
              </p>
              <p>
                <strong>Tags:</strong> {(material.tags || []).join(', ') || 'General'}
              </p>
              {material.rubricCriteria && material.rubricCriteria.length > 0 && (
                <p>
                  <strong>Grading Criteria:</strong> {material.rubricCriteria.length} evaluation criteria attached
                </p>
              )}
            </div>

            {signedUrl && (
              <div className="flex justify-end">
                <Button
                  onClick={handleDownload}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download File
                </Button>
              </div>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
