import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowLeft, ArrowRight, Bot, Edit3, RefreshCw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AgentWizardAnswers, AgentWizardDraft } from '../../types';
import { createAgentWizardDraft } from '../../services/api';

const emptyAnswers: AgentWizardAnswers = {
  agentName: '',
  purpose: '',
  mainTasks: '',
  targetUsers: '',
  personality: '',
  tone: '',
  languageStyle: '',
  knowledgeSummary: '',
  faq: '',
  processes: '',
  policies: '',
  constraints: '',
  handoffRules: '',
};

interface AgentCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onCreate: (draft: AgentWizardDraft) => Promise<void>;
  onAdvancedEdit: (draft: AgentWizardDraft) => void;
}

export const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  open,
  onClose,
  onSkip,
  onCreate,
  onAdvancedEdit,
}) => {
  const { t, i18n } = useTranslation();
  const [answers, setAnswers] = useState<AgentWizardAnswers>(emptyAnswers);
  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<AgentWizardDraft | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(
    () => [
      t('agents.wizard.steps.name'),
      t('agents.wizard.steps.purpose'),
      t('agents.wizard.steps.personality'),
      t('agents.wizard.steps.knowledge'),
      t('agents.wizard.steps.constraints'),
    ],
    [t]
  );

  const isReviewStep = activeStep >= steps.length;
  const isBusy = isDrafting || isCreating;

  const updateAnswer =
    (field: keyof AgentWizardAnswers) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAnswers((prev) => ({ ...prev, [field]: event.target.value }));
      setError(null);
    };

  const canContinue = () => {
    if (activeStep === 0) {
      return answers.agentName.trim().length > 0;
    }

    if (activeStep === 1) {
      return answers.purpose.trim().length > 0 || answers.mainTasks.trim().length > 0;
    }

    return true;
  };

  const handleClose = () => {
    if (!isBusy) {
      resetWizard();
      onClose();
    }
  };

  const handleSkip = () => {
    if (!isBusy) {
      resetWizard();
      onSkip();
    }
  };

  const handleBack = () => {
    setError(null);
    if (isReviewStep) {
      setActiveStep(steps.length - 1);
      return;
    }
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (!canContinue()) {
      setError(t('agents.wizard.validation.required'));
      return;
    }
    setError(null);
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleDraft = async () => {
    if (!canContinue()) {
      setError(t('agents.wizard.validation.required'));
      return;
    }

    setIsDrafting(true);
    setError(null);

    try {
      const response = await createAgentWizardDraft({
        answers,
        locale: i18n.language,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || t('agents.wizard.errors.draftFailed'));
      }

      setDraft(response.data);
      setActiveStep(steps.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents.wizard.errors.draftFailed'));
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCreate = async () => {
    if (!draft) return;

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(draft);
      resetWizard();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents.wizard.errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAdvancedEdit = () => {
    if (!draft || isBusy) return;

    const selectedDraft = draft;
    resetWizard();
    onAdvancedEdit(selectedDraft);
  };

  const resetWizard = () => {
    setAnswers(emptyAnswers);
    setActiveStep(0);
    setDraft(null);
    setError(null);
    setIsDrafting(false);
    setIsCreating(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ className: 'bg-white dark:bg-slate-800' }}
    >
      <DialogTitle className="border-b border-gray-200 dark:border-slate-700">
        <Box className="flex items-start justify-between gap-4">
          <Box className="flex items-center gap-3">
            <Box className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/50">
              <Bot size={22} className="text-indigo-600 dark:text-indigo-400" />
            </Box>
            <Box>
              <Typography variant="h6" className="font-semibold text-gray-900 dark:text-slate-100">
                {t('agents.wizard.title')}
              </Typography>
              <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
                {t('agents.wizard.subtitle')}
              </Typography>
            </Box>
          </Box>
          <Box className="flex items-center gap-1">
            <Button size="small" onClick={handleSkip} disabled={isBusy}>
              {t('agents.wizard.actions.skip')}
            </Button>
            <Tooltip title={t('agents.wizard.actions.close')}>
              <IconButton onClick={handleClose} disabled={isBusy} size="small">
                <X size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      {isDrafting && <LinearProgress />}

      <DialogContent className="px-6 py-6">
        <Stepper activeStep={Math.min(activeStep, steps.length - 1)} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box className="mt-6 min-h-[390px]">
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {isReviewStep && draft ? (
            <ReviewStep draft={draft} />
          ) : (
            <WizardStep
              activeStep={activeStep}
              answers={answers}
              onChange={updateAnswer}
              isBusy={isBusy}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions className="border-t border-gray-200 px-6 py-4 dark:border-slate-700">
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={isBusy || (activeStep === 0 && !isReviewStep)}
          startIcon={<ArrowLeft size={16} />}
        >
          {t('agents.wizard.actions.back')}
        </Button>

        <Box className="flex-1" />

        {isReviewStep && draft ? (
          <>
            <Button
              variant="outlined"
              onClick={handleDraft}
              disabled={isBusy}
              startIcon={isDrafting ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
            >
              {isDrafting
                ? t('agents.wizard.actions.drafting')
                : t('agents.wizard.actions.retry')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleAdvancedEdit}
              disabled={isBusy}
              startIcon={<Edit3 size={16} />}
            >
              {t('agents.wizard.actions.advancedEdit')}
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={isBusy}
              startIcon={isCreating ? <CircularProgress size={16} /> : <Sparkles size={16} />}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isCreating
                ? t('agents.wizard.actions.creating')
                : t('agents.wizard.actions.create')}
            </Button>
          </>
        ) : activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleDraft}
            disabled={isBusy}
            startIcon={isDrafting ? <CircularProgress size={16} /> : <Sparkles size={16} />}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isDrafting
              ? t('agents.wizard.actions.drafting')
              : t('agents.wizard.actions.generateDraft')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isBusy}
            endIcon={<ArrowRight size={16} />}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {t('agents.wizard.actions.next')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

interface WizardStepProps {
  activeStep: number;
  answers: AgentWizardAnswers;
  onChange: (
    field: keyof AgentWizardAnswers
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isBusy: boolean;
}

const WizardStep: React.FC<WizardStepProps> = ({ activeStep, answers, onChange, isBusy }) => {
  const { t } = useTranslation();

  if (activeStep === 0) {
    return (
      <QuestionSection title={t('agents.wizard.questions.agentName')}>
        <TextField
          fullWidth
          label={t('agents.wizard.fields.agentName')}
          placeholder={t('agents.wizard.placeholders.agentName')}
          value={answers.agentName}
          onChange={onChange('agentName')}
          disabled={isBusy}
          required
        />
      </QuestionSection>
    );
  }

  if (activeStep === 1) {
    return (
      <QuestionSection title={t('agents.wizard.questions.purpose')}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          label={t('agents.wizard.fields.purpose')}
          placeholder={t('agents.wizard.placeholders.purpose')}
          value={answers.purpose}
          onChange={onChange('purpose')}
          disabled={isBusy}
          required
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.mainTasks')}
          value={answers.mainTasks}
          onChange={onChange('mainTasks')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={t('agents.wizard.fields.targetUsers')}
          value={answers.targetUsers}
          onChange={onChange('targetUsers')}
          disabled={isBusy}
        />
      </QuestionSection>
    );
  }

  if (activeStep === 2) {
    return (
      <QuestionSection title={t('agents.wizard.questions.personality')}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.personality')}
          placeholder={t('agents.wizard.placeholders.personality')}
          value={answers.personality}
          onChange={onChange('personality')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={t('agents.wizard.fields.tone')}
          value={answers.tone}
          onChange={onChange('tone')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={t('agents.wizard.fields.languageStyle')}
          value={answers.languageStyle}
          onChange={onChange('languageStyle')}
          disabled={isBusy}
        />
      </QuestionSection>
    );
  }

  if (activeStep === 3) {
    return (
      <QuestionSection title={t('agents.wizard.questions.knowledge')}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.knowledgeSummary')}
          placeholder={t('agents.wizard.placeholders.knowledge')}
          value={answers.knowledgeSummary}
          onChange={onChange('knowledgeSummary')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.faq')}
          value={answers.faq}
          onChange={onChange('faq')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.processes')}
          value={answers.processes}
          onChange={onChange('processes')}
          disabled={isBusy}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('agents.wizard.fields.policies')}
          value={answers.policies}
          onChange={onChange('policies')}
          disabled={isBusy}
        />
      </QuestionSection>
    );
  }

  return (
    <QuestionSection title={t('agents.wizard.questions.constraints')}>
      <TextField
        fullWidth
        multiline
        minRows={4}
        label={t('agents.wizard.fields.constraints')}
        placeholder={t('agents.wizard.placeholders.constraints')}
        value={answers.constraints}
        onChange={onChange('constraints')}
        disabled={isBusy}
      />
      <TextField
        fullWidth
        multiline
        minRows={3}
        label={t('agents.wizard.fields.handoffRules')}
        value={answers.handoffRules}
        onChange={onChange('handoffRules')}
        disabled={isBusy}
      />
    </QuestionSection>
  );
};

const QuestionSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box>
    <Typography variant="h6" className="mb-4 font-semibold text-gray-900 dark:text-slate-100">
      {title}
    </Typography>
    <Box className="space-y-4">{children}</Box>
  </Box>
);

const ReviewStep: React.FC<{ draft: AgentWizardDraft }> = ({ draft }) => {
  const { t } = useTranslation();

  return (
    <Box className="space-y-5">
      <Box>
        <Typography variant="overline" className="text-gray-500 dark:text-slate-400">
          {t('agents.wizard.review.agent')}
        </Typography>
        <Typography variant="h6" className="font-semibold text-gray-900 dark:text-slate-100">
          {draft.agent.name}
        </Typography>
        <Typography variant="body2" className="mt-1 text-gray-600 dark:text-slate-300">
          {draft.agent.description}
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle1" className="mb-3 font-semibold text-gray-900 dark:text-slate-100">
          {t('agents.wizard.review.characteristics')}
        </Typography>
        <Box className="space-y-3">
          {draft.characteristics.map((characteristic) => (
            <Box
              key={characteristic.code}
              className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
            >
              <Box className="mb-2 flex flex-wrap items-center gap-2">
                <Typography variant="subtitle2" className="font-semibold text-gray-900 dark:text-slate-100">
                  {characteristic.name}
                </Typography>
                <Chip
                  size="small"
                  label={t(`agents.characteristics.layers.${characteristic.layer}`)}
                  className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                />
              </Box>
              <Typography
                variant="body2"
                className="whitespace-pre-line text-gray-600 dark:text-slate-300"
              >
                {characteristic.prompt}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle1" className="mb-3 font-semibold text-gray-900 dark:text-slate-100">
          {t('agents.wizard.review.knowledge')}
        </Typography>
        {draft.knowledges.length === 0 ? (
          <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
            {t('agents.wizard.review.noKnowledge')}
          </Typography>
        ) : (
          <Box className="space-y-3">
            {draft.knowledges.map((knowledge) => (
              <Box
                key={knowledge.name}
                className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
              >
                <Typography variant="subtitle2" className="font-semibold text-gray-900 dark:text-slate-100">
                  {knowledge.name}
                </Typography>
                {knowledge.description && (
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                    {knowledge.description}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  className="mt-2 line-clamp-5 whitespace-pre-line text-gray-600 dark:text-slate-300"
                >
                  {knowledge.content}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {draft.warnings.length > 0 && (
        <Alert severity="warning" icon={<RefreshCw size={18} />}>
          {draft.warnings.join(' ')}
        </Alert>
      )}
    </Box>
  );
};
