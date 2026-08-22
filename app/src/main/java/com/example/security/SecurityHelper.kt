package com.example.security

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecurityHelper(private val context: Context) {

    private val keyStoreAlias = "TendaMasterKey"
    private val keyStoreProvider = "AndroidKeyStore"
    private val transformation = "AES/GCM/NoPadding"
    private val prefs: SharedPreferences = context.getSharedPreferences("tenda_secure_vault", Context.MODE_PRIVATE)

    init {
        initKeyStore()
    }

    private fun initKeyStore() {
        val keyStore = KeyStore.getInstance(keyStoreProvider).apply { load(null) }
        if (!keyStore.containsAlias(keyStoreAlias)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, keyStoreProvider)
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                keyStoreAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
            keyGenerator.init(keyGenParameterSpec)
            keyGenerator.generateKey()
        }
    }

    private fun getSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(keyStoreProvider).apply { load(null) }
        return keyStore.getKey(keyStoreAlias, null) as SecretKey
    }

    fun encryptAndStore(key: String, plainText: String) {
        try {
            val cipher = Cipher.getInstance(transformation)
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey())
            val iv = cipher.iv
            val encryptedBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))

            val ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP)
            val dataBase64 = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)

            prefs.edit()
                .putString("${key}_iv", ivBase64)
                .putString("${key}_data", dataBase64)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun retrieveAndDecrypt(key: String): String? {
        return try {
            val ivBase64 = prefs.getString("${key}_iv", null) ?: return null
            val dataBase64 = prefs.getString("${key}_data", null) ?: return null

            val iv = Base64.decode(ivBase64, Base64.NO_WRAP)
            val encryptedBytes = Base64.decode(dataBase64, Base64.NO_WRAP)

            val cipher = Cipher.getInstance(transformation)
            val spec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec)

            val decryptedBytes = cipher.doFinal(encryptedBytes)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun remove(key: String) {
        prefs.edit()
            .remove("${key}_iv")
            .remove("${key}_data")
            .apply()
    }
}
