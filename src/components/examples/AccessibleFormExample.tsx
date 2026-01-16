/**
 * Example component demonstrating accessible form implementation
 *
 * This example shows:
 * - Proper form structure with accessible inputs
 * - Error handling with screen reader announcements
 * - Loading states with accessible feedback
 * - Keyboard navigation
 * - Focus management
 */

import React, { useState } from 'react';
import { AccessibleInput } from '@/components/ui/AccessibleInput';
import { AccessibleButton } from '@/components/ui/AccessibleButton';
import { LiveRegion, useScreenReaderAnnouncement } from '@/components/ui/LiveRegion';
import { Save, CheckCircle } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function AccessibleFormExample() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { message, announce } = useScreenReaderAnnouncement();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      announce(`Form has ${Object.keys(newErrors).length} error(s). Please fix them and try again.`, 'assertive');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    announce('Submitting form...', 'polite');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIsSuccess(true);
      announce('Form submitted successfully!', 'polite');

      // Reset form after success
      setTimeout(() => {
        setFormData({ name: '', email: '', message: '' });
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      announce('Failed to submit form. Please try again.', 'assertive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Page heading with proper hierarchy */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Contact Form
        </h1>
        <p className="text-gray-600">
          Fill out the form below to send us a message. All fields are required.
        </p>
      </div>

      {/* Live region for screen reader announcements */}
      <LiveRegion message={message} politeness="polite" />

      {/* Success message */}
      {isSuccess && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
        >
          <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
          <div>
            <h2 className="text-green-900 font-semibold">Success!</h2>
            <p className="text-green-700 text-sm">
              Your message has been sent successfully.
            </p>
          </div>
        </div>
      )}

      {/* Accessible form */}
      <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
        <div className="space-y-6">
          {/* Name input */}
          <AccessibleInput
            label="Full Name"
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            error={errors.name}
            required
            placeholder="John Doe"
            disabled={isSubmitting}
          />

          {/* Email input */}
          <AccessibleInput
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            required
            placeholder="john@example.com"
            helperText="We'll never share your email with anyone else"
            disabled={isSubmitting}
          />

          {/* Message textarea - using accessible input pattern */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message
              <span className="text-red-500 ml-0.5">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={handleInputChange('message')}
              rows={5}
              required
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                errors.message
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="Tell us what you're thinking..."
            />
            {errors.message && (
              <p
                id="message-error"
                role="alert"
                aria-live="polite"
                className="mt-1 text-sm text-red-600"
              >
                {errors.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <div className="flex gap-4">
            <AccessibleButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting || isSuccess}
              icon={<Save className="h-4 w-4" />}
              iconPosition="left"
              ariaLabel={isSubmitting ? 'Submitting form...' : 'Submit contact form'}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </AccessibleButton>

            <AccessibleButton
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setFormData({ name: '', email: '', message: '' });
                setErrors({});
                announce('Form cleared', 'polite');
              }}
              disabled={isSubmitting}
              ariaLabel="Clear form"
            >
              Clear
            </AccessibleButton>
          </div>
        </div>
      </form>

      {/* Keyboard shortcuts hint */}
      <div
        className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        role="complementary"
        aria-label="Keyboard shortcuts"
      >
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Keyboard Shortcuts
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 rounded">Tab</kbd> - Move to next field</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 rounded">Shift+Tab</kbd> - Move to previous field</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 rounded">Enter</kbd> - Submit form</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 rounded">Escape</kbd> - Clear form</li>
        </ul>
      </div>
    </div>
  );
}
