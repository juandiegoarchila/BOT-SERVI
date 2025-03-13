// src/handlers/state-dispatcher.js
import {
  handleAwaitingOrderCount,
  handleDefiningLunchGroups,
  handleDefiningGroupSoup,
  handleDefiningGroupPrinciple,
  handleDefiningGroupProtein,
  handleDefiningGroupExtraProtein,
  handleDefiningGroupExtraProteinCount,
  handleDefiningGroupExtraProteinType,
  handleDefiningGroupDrink,
  handleDefiningGroupSaladRice,
  handleDefiningRemaining,
  handleDefiningDifferentSoup,  
  handleDefiningDifferentPrinciple,
  handleDefiningDifferentProtein,
  handleDefiningDifferentExtraProtein,
  handleDefiningDifferentExtraProteinType,
  handleDefiningDifferentDrink,
  handleDefiningDifferentSaladRice,
  handleDefiningSingleLunchSoup,
  handleDefiningSingleLunchPrinciple,
  handleDefiningSingleLunchProtein,
  handleDefiningSingleLunchExtraProtein,
  handleDefiningSingleLunchExtraProteinType,
  handleDefiningSingleLunchDrink,
  handleDefiningSingleLunchSaladRice,
} from './lunch-handlers.js';

import {
  handleOrderingTime,
  handleOrderingSameAddress,
  handleOrderingAddressSingle,
  handleConfirmingAddressSingle,
  handleOrderingAddressMultiple,
  handleOrderingPayment,
  handleOrderingCutlery,
  handlePreviewOrder,
  handleCompleted,
} from './order-handlers.js';

const stateHandlers = {
  awaiting_order_count: handleAwaitingOrderCount,
  defining_lunch_groups: handleDefiningLunchGroups,
  defining_group_soup: handleDefiningGroupSoup,
  defining_group_principle: handleDefiningGroupPrinciple,
  defining_group_protein: handleDefiningGroupProtein,
  defining_group_extra_protein: handleDefiningGroupExtraProtein,
  defining_group_extra_protein_count: handleDefiningGroupExtraProteinCount,
  defining_group_extra_protein_type: handleDefiningGroupExtraProteinType,
  defining_group_drink: handleDefiningGroupDrink,
  defining_group_salad_rice: handleDefiningGroupSaladRice,
  defining_remaining: handleDefiningRemaining,
  defining_different_soup: handleDefiningDifferentSoup,
  defining_different_principle: handleDefiningDifferentPrinciple,
  defining_different_protein: handleDefiningDifferentProtein,
  defining_different_extra_protein: handleDefiningDifferentExtraProtein,
  defining_different_extra_protein_type: handleDefiningDifferentExtraProteinType,
  defining_different_drink: handleDefiningDifferentDrink,
  defining_different_salad_rice: handleDefiningDifferentSaladRice,
  defining_single_lunch_soup: handleDefiningSingleLunchSoup,
  defining_single_lunch_principle: handleDefiningSingleLunchPrinciple,
  defining_single_lunch_protein: handleDefiningSingleLunchProtein,
  defining_single_lunch_extra_protein: handleDefiningSingleLunchExtraProtein,
  defining_single_lunch_extra_protein_type: handleDefiningSingleLunchExtraProteinType,
  defining_single_lunch_drink: handleDefiningSingleLunchDrink,
  defining_single_lunch_salad_rice: handleDefiningSingleLunchSaladRice,
  ordering_time: handleOrderingTime,
  ordering_same_address: handleOrderingSameAddress,
  ordering_address_single: handleOrderingAddressSingle,
  confirming_address_single: handleConfirmingAddressSingle,
  ordering_address_multiple: handleOrderingAddressMultiple,
  ordering_payment: handleOrderingPayment,
  ordering_cutlery: handleOrderingCutlery,
  preview_order: handlePreviewOrder,
  completed: handleCompleted,
};

export function dispatchState(conversation, message) {
  const handler = stateHandlers[conversation.step];
  if (handler) {
    return handler(conversation, message);
  }
  return {
    main: `❌ Estado desconocido: ${conversation.step}. Por favor, reinicia tu pedido diciendo "hola".`,
    clearConversation: true,
  };
}