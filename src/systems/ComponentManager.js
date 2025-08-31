const { Collection } = require('discord.js');

class ComponentManager {
    constructor() {
        this.componentStates = new Map(); // Store component states
        this.interactionTimeouts = new Map(); // Store interaction timeouts
        this.componentCallbacks = new Map(); // Store component callbacks
    }

    // Store component state for later retrieval
    storeComponentState(customId, userId, state) {
        const key = `${customId}_${userId}`;
        this.componentStates.set(key, {
            state,
            timestamp: Date.now(),
            userId,
            customId
        });

        // Auto-cleanup after 15 minutes
        setTimeout(() => {
            this.componentStates.delete(key);
        }, 15 * 60 * 1000);
    }

    // Retrieve component state
    getComponentState(customId, userId) {
        const key = `${customId}_${userId}`;
        const stateData = this.componentStates.get(key);
        
        if (!stateData) {
            return null;
        }

        // Check if state is expired (15 minutes)
        const now = Date.now();
        if (now - stateData.timestamp > 15 * 60 * 1000) {
            this.componentStates.delete(key);
            return null;
        }

        return stateData.state;
    }

    // Clear component state
    clearComponentState(customId, userId) {
        const key = `${customId}_${userId}`;
        this.componentStates.delete(key);
    }

    // Register a component callback
    registerCallback(customId, callback, timeout = 15 * 60 * 1000) {
        this.componentCallbacks.set(customId, callback);

        // Set timeout for cleanup
        const timeoutId = setTimeout(() => {
            this.componentCallbacks.delete(customId);
            this.interactionTimeouts.delete(customId);
        }, timeout);

        this.interactionTimeouts.set(customId, timeoutId);
    }

    // Execute a component callback
    async executeCallback(customId, interaction) {
        const callback = this.componentCallbacks.get(customId);
        if (!callback) {
            return false;
        }

        try {
            await callback(interaction);
            return true;
        } catch (error) {
            console.error(`Error executing callback for ${customId}:`, error);
            throw error;
        }
    }

    // Check if a callback exists
    hasCallback(customId) {
        return this.componentCallbacks.has(customId);
    }

    // Clear a callback
    clearCallback(customId) {
        const timeoutId = this.interactionTimeouts.get(customId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.interactionTimeouts.delete(customId);
        }
        this.componentCallbacks.delete(customId);
    }

    // Store multi-step component flow
    storeComponentFlow(flowId, userId, steps) {
        const key = `flow_${flowId}_${userId}`;
        this.componentStates.set(key, {
            steps,
            currentStep: 0,
            data: {},
            timestamp: Date.now(),
            userId,
            flowId
        });

        // Auto-cleanup after 30 minutes for flows
        setTimeout(() => {
            this.componentStates.delete(key);
        }, 30 * 60 * 1000);
    }

    // Get component flow state
    getComponentFlow(flowId, userId) {
        const key = `flow_${flowId}_${userId}`;
        return this.getComponentState(`flow_${flowId}`, userId);
    }

    // Advance component flow to next step
    advanceComponentFlow(flowId, userId, data = {}) {
        const key = `flow_${flowId}_${userId}`;
        const flowState = this.componentStates.get(key);
        
        if (!flowState) {
            return null;
        }

        // Update flow data
        Object.assign(flowState.data, data);
        flowState.currentStep++;
        flowState.timestamp = Date.now();

        // Check if flow is complete
        if (flowState.currentStep >= flowState.steps.length) {
            this.componentStates.delete(key);
            return {
                completed: true,
                data: flowState.data
            };
        }

        return {
            completed: false,
            currentStep: flowState.currentStep,
            nextStep: flowState.steps[flowState.currentStep],
            data: flowState.data
        };
    }

    // Store pagination state
    storePaginationState(messageId, userId, data, currentPage = 0) {
        const key = `pagination_${messageId}_${userId}`;
        this.componentStates.set(key, {
            data,
            currentPage,
            totalPages: data.length,
            timestamp: Date.now(),
            userId,
            messageId
        });

        // Auto-cleanup after 1 hour for pagination
        setTimeout(() => {
            this.componentStates.delete(key);
        }, 60 * 60 * 1000);
    }

    // Get pagination state
    getPaginationState(messageId, userId) {
        const key = `pagination_${messageId}_${userId}`;
        return this.getComponentState(`pagination_${messageId}`, userId);
    }

    // Update pagination page
    updatePaginationPage(messageId, userId, newPage) {
        const key = `pagination_${messageId}_${userId}`;
        const paginationState = this.componentStates.get(key);
        
        if (!paginationState) {
            return null;
        }

        // Validate page bounds
        if (newPage < 0 || newPage >= paginationState.totalPages) {
            return null;
        }

        paginationState.currentPage = newPage;
        paginationState.timestamp = Date.now();

        return paginationState;
    }

    // Store form state for multi-step forms
    storeFormState(formId, userId, formData) {
        const key = `form_${formId}_${userId}`;
        this.componentStates.set(key, {
            formData,
            timestamp: Date.now(),
            userId,
            formId
        });

        // Auto-cleanup after 20 minutes for forms
        setTimeout(() => {
            this.componentStates.delete(key);
        }, 20 * 60 * 1000);
    }

    // Update form field
    updateFormField(formId, userId, fieldName, value) {
        const key = `form_${formId}_${userId}`;
        const formState = this.componentStates.get(key);
        
        if (!formState) {
            return false;
        }

        formState.formData[fieldName] = value;
        formState.timestamp = Date.now();
        return true;
    }

    // Get form state
    getFormState(formId, userId) {
        const key = `form_${formId}_${userId}`;
        return this.getComponentState(`form_${formId}`, userId);
    }

    // Generate unique component ID
    generateUniqueId(prefix = 'component') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${random}`;
    }

    // Clean up expired states (call periodically)
    cleanupExpiredStates() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour max age

        for (const [key, stateData] of this.componentStates) {
            if (now - stateData.timestamp > maxAge) {
                console.log(`[COMPONENT] Cleaning up expired state: ${key}`);
                this.componentStates.delete(key);
            }
        }
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        // Clean up every 15 minutes
        setInterval(() => {
            this.cleanupExpiredStates();
        }, 15 * 60 * 1000);

        console.log('[COMPONENT] Started periodic state cleanup');
    }

    // Get statistics
    getStatistics() {
        return {
            activeStates: this.componentStates.size,
            activeCallbacks: this.componentCallbacks.size,
            activeTimeouts: this.interactionTimeouts.size
        };
    }

    // Clear all states for a user
    clearUserStates(userId) {
        for (const [key, stateData] of this.componentStates) {
            if (stateData.userId === userId) {
                this.componentStates.delete(key);
            }
        }
    }

    // Export component state for debugging
    exportState() {
        const states = {};
        for (const [key, stateData] of this.componentStates) {
            states[key] = {
                timestamp: stateData.timestamp,
                userId: stateData.userId,
                hasState: !!stateData.state
            };
        }
        return states;
    }
}

// Export singleton instance
module.exports = new ComponentManager();
