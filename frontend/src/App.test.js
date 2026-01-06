import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock fetch for testing
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders Trade-Off Referee title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Trade-Off Referee/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders question input form', () => {
    render(<App />);
    const textareaElement = screen.getByLabelText(/Ask a question/i);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    
    expect(textareaElement).toBeInTheDocument();
    expect(buttonElement).toBeInTheDocument();
  });

  test('shows initial empty state message', () => {
    render(<App />);
    const emptyStateMessage = screen.getByText(/Enter your project or decision question/i);
    expect(emptyStateMessage).toBeInTheDocument();
  });

  test('disables submit button when input is empty', () => {
    render(<App />);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    expect(buttonElement).toBeDisabled();
  });

  test('enables submit button when input has text', () => {
    render(<App />);
    const textareaElement = screen.getByLabelText(/Ask a question/i);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    
    fireEvent.change(textareaElement, { target: { value: 'Test question' } });
    expect(buttonElement).not.toBeDisabled();
  });

  test('shows loading state when submitting question', async () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<App />);
    const textareaElement = screen.getByLabelText(/Ask a question/i);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    
    fireEvent.change(textareaElement, { target: { value: 'Test question' } });
    fireEvent.click(buttonElement);
    
    expect(screen.getByText(/Analyzing.../i)).toBeInTheDocument();
  });

  test('displays error message on API failure', async () => {
    fetch.mockRejectedValue(new Error('API Error'));
    
    render(<App />);
    const textareaElement = screen.getByLabelText(/Ask a question/i);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    
    fireEvent.change(textareaElement, { target: { value: 'Test question' } });
    fireEvent.click(buttonElement);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  test('displays analysis results on successful API response', async () => {
    const mockResponse = {
      problem_summary: 'Test problem summary',
      primary_approach: {
        title: 'Primary Approach',
        description: 'Primary description',
        pros: ['Pro 1', 'Pro 2'],
        cons: ['Con 1'],
        tradeoffs: 'Primary tradeoffs'
      },
      alternative_approach: {
        title: 'Alternative Approach',
        description: 'Alternative description',
        pros: ['Alt Pro 1'],
        cons: ['Alt Con 1', 'Alt Con 2'],
        tradeoffs: 'Alternative tradeoffs'
      },
      when_to_choose: {
        choose_primary_if: ['Condition 1'],
        choose_alternative_if: ['Condition 2']
      },
      optional_hybrid_strategy: 'Hybrid strategy',
      final_recommendation: 'Final recommendation'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    
    render(<App />);
    const textareaElement = screen.getByLabelText(/Ask a question/i);
    const buttonElement = screen.getByRole('button', { name: /Compare Approaches/i });
    
    fireEvent.change(textareaElement, { target: { value: 'Test question' } });
    fireEvent.click(buttonElement);
    
    await waitFor(() => {
      expect(screen.getByText('Test problem summary')).toBeInTheDocument();
      expect(screen.getByText('Primary Approach')).toBeInTheDocument();
      expect(screen.getByText('Alternative Approach')).toBeInTheDocument();
      expect(screen.getByText('Final recommendation')).toBeInTheDocument();
    });
  });
});