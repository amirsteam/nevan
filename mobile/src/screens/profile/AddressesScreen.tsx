/**
 * Addresses Screen
 * Manage user delivery addresses
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Home,
  Briefcase,
} from "lucide-react-native";
import type { AddressesScreenProps } from "../../navigation/types";

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type: "home" | "work" | "other";
}

// Mock data - replace with API call when backend endpoint is ready
const mockAddresses: Address[] = [];

const AddressesScreen: React.FC<AddressesScreenProps> = ({ navigation }) => {
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    label: "",
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Nepal",
    type: "home" as "home" | "work" | "other",
  });

  const resetForm = () => {
    setFormData({
      label: "",
      fullName: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Nepal",
      type: "home",
    });
    setEditingAddress(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      type: address.type,
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    // Validation
    if (
      !formData.fullName ||
      !formData.phone ||
      !formData.street ||
      !formData.city
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (editingAddress) {
        setAddresses((prev) =>
          prev.map((addr) =>
            addr.id === editingAddress.id
              ? { ...addr, ...formData, id: addr.id, isDefault: addr.isDefault }
              : addr,
          ),
        );
      } else {
        const newAddress: Address = {
          id: Date.now().toString(),
          ...formData,
          isDefault: addresses.length === 0,
        };
        setAddresses((prev) => [...prev, newAddress]);
      }
      setIsLoading(false);
      setModalVisible(false);
      resetForm();
    }, 500);
  };

  const handleDelete = (addressId: string) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setAddresses((prev) =>
              prev.filter((addr) => addr.id !== addressId),
            );
          },
        },
      ],
    );
  };

  const setAsDefault = (addressId: string) => {
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      })),
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home size={16} color="#666" />;
      case "work":
        return <Briefcase size={16} color="#666" />;
      default:
        return <MapPin size={16} color="#666" />;
    }
  };

  const renderAddress = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeContainer}>
          {getTypeIcon(item.type)}
          <Text style={styles.addressLabel}>
            {item.label ||
              item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Edit3 size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addressName}>{item.fullName}</Text>
      <Text style={styles.addressPhone}>{item.phone}</Text>
      <Text style={styles.addressText}>
        {item.street}
        {"\n"}
        {item.city}, {item.state} {item.postalCode}
        {"\n"}
        {item.country}
      </Text>

      {!item.isDefault && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => setAsDefault(item.id)}
        >
          <Check size={16} color="#4CAF50" />
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MapPin size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>No Addresses Saved</Text>
            <Text style={styles.emptyText}>
              Add your delivery addresses for faster checkout
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Address Type */}
            <Text style={styles.inputLabel}>Address Type</Text>
            <View style={styles.typeSelector}>
              {(["home", "work", "other"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.type === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  {getTypeIcon(type)}
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Label (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My Home, Office"
              value={formData.label}
              onChangeText={(text) => setFormData({ ...formData, label: text })}
            />

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full name"
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Street Address *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Enter street address"
              value={formData.street}
              onChangeText={(text) =>
                setFormData({ ...formData, street: text })
              }
              multiline
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city"
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />

            <Text style={styles.inputLabel}>State/Province</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter state or province"
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
            />

            <Text style={styles.inputLabel}>Postal Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter postal code"
              value={formData.postalCode}
              onChangeText={(text) =>
                setFormData({ ...formData, postalCode: text })
              }
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter country"
              value={formData.country}
              onChangeText={(text) =>
                setFormData({ ...formData, country: text })
              }
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  defaultBadge: {
    backgroundColor: "#4CAF5020",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
  },
  addressActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  setDefaultButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  setDefaultText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  typeButtonActive: {
    borderColor: "#000",
    backgroundColor: "#f5f5f5",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#666",
  },
  typeButtonTextActive: {
    color: "#000",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddressesScreen;
